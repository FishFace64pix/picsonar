# PicSonar — Prod Açma Runbook'u (Türkçe, Adım-Adım)

Bu belge, kodun tamamen hazır olduğu şu andan itibaren **prod'u canlıya almak
için senin elle yapman gereken her adımı** sırayla anlatır. Birini atlama;
sıra önemli (örneğin SES verify'i bitmeden ACM cert oluşturmak zaman kaybıdır
çünkü validation email'leri hedef domain'e düşer).

Toplam tahmini süre: **10-14 iş günü** (büyük kısmı bekleme — Stripe KYC
48-72 saat, SES prod-access 24 saat, Romania SRL'in zaten kurulu olduğunu
varsayıyoruz; değilse + 4-6 hafta).

Zorluk / risk işaretleri: 🟢 kolay, 🟡 dikkat, 🔴 yanlış yaparsan prod
açılmaz / para kaybedersin.

---

## 0. Önkoşullar — sende olması lazım

Başlamadan önce elinde bunlar olmalı:

- **Romanya'da tüzel kişilik:** SRL veya PFA. CUI (`ROxxxxxxxx`), ONRC
  (`J40/xxxx/yyyy`) ve kayıtlı iş adresin var. Yoksa önce muhasebecinle bunu
  halledeceksin — bankaya hesap açana kadar 4-6 hafta sürer.
- **Muhasebeci kontratı:** aylık Stripe payout raporunu SPV'ye yüklemeyi
  kabul etmiş, OPANAF 1783/2022'e aşina bir mali müşavir.
- **İş banka hesabı** (IBAN): Stripe payout'ları buraya düşecek.
- **Kurumsal email:** `contact@picsonar.ro`, `security@picsonar.ro`,
  `noreply@picsonar.ro`, `dpo@picsonar.ro` (en azından ilk üçü MX'li gerçek
  inbox, `noreply` sadece outbound SES olacak).
- **Kredi kartı:** AWS + domain registrar + (gerekirse) Stripe onboarding
  için.
- **GitHub organizasyonu** (veya kişisel hesap): kodun bulunduğu yer.
  Protected-branch kuralları zaten aktif olmalı.

---

## 1. Domain — `picsonar.ro` + `picsonar.com` 🟢

### 1.1 Registrar'dan al
RoTLD akredite bir registrar üzerinden `picsonar.ro` ve `picsonar.com`
alanlarını satın al. Tavsiye: tek registrar kullan (yönetim kolaylığı).
Gandi, Namecheap veya Cloudflare Registrar çalışır.

### 1.2 Route53'e transfer et (opsiyonel ama tavsiye)
- AWS Console → Route53 → **Registered domains → Transfer in**.
- Eski registrar'dan auth code al, Route53'e yapıştır.
- ~5 gün alır, ücretsiz yapılır.
- Alternatif: registrar'da bırakıp sadece **Hosted zone** oluştur ve
  nameserver'ları Route53'e çevir (ucuza gelir, aynı kontrol).

### 1.3 Hosted zone oluştur
```bash
aws route53 create-hosted-zone \
  --name picsonar.ro \
  --caller-reference "$(date +%s)"
```
Çıktıdaki 4 NS kaydını registrar panelinde tanımla (transfer etmediysen).

Aynı adımı `picsonar.com` için de tekrarla.

---

## 2. AWS hesap bootstrap 🟡

### 2.1 AWS hesabını aç / hazırla
- Yeni hesap açacaksan: https://aws.amazon.com/ → Create an AWS Account. Root
  kullanıcıya **hemen MFA** tak (Google Authenticator veya YubiKey).
- Mevcut hesap kullanacaksan: root'ta MFA'yı kontrol et, **root hariç** bir
  IAM admin user oluştur ve root'u bir daha kullanma.

### 2.2 Billing alert
- AWS Console → **Billing → Budgets → Create budget**.
- Amount: `$50/ay` (dev için) ve `$500/ay` (prod için üst limit).
- Threshold: %80'de email alarmı.
- Bu olmazsa bir yanlış loop seni 10k $'a sokabilir.

### 2.3 Region seçimi
- **eu-central-1 (Frankfurt)** — GDPR/veri ikametgahı için mantıklı
  seçenek. Kod tüm kaynaklarda zaten bu region'ı hedefliyor.
- CloudFront için ayrıca **us-east-1**'de ACM cert gerekecek (global
  servis).

### 2.4 AWS CLI'ı local'de yapılandır
```bash
aws configure --profile picsonar-prod
# Access key + secret'ı IAM admin user'dan al. Region: eu-central-1.
# Output: json

# Doğrula:
aws sts get-caller-identity --profile picsonar-prod
```

### 2.5 (Opsiyonel) AWS Organizations
Production ile development'i aynı AWS hesabında karıştırma riskini
azaltmak istersen Organizations altında iki ayrı hesap kur (`prod`, `dev`).
Launch için zorunlu değil, ama ileride fayda görür.

---

## 3. IAM: GitHub OIDC + Deploy Role 🔴

Bu olmazsa CI/CD deploy edemez. `docs/runbooks/secret-rotation.md` §5'te de
geçiyor ama pratik adımlar:

### 3.1 OIDC identity provider
```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 \
  --profile picsonar-prod
```
Thumbprint GitHub'un root CA'sı — değişirse GitHub docs'tan güncel değeri al.

### 3.2 Trust policy dosyası
Local'de `trust-policy.json` yarat:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::<AWS_ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
      },
      "StringLike": {
        "token.actions.githubusercontent.com:sub": "repo:<GITHUB_ORG>/<REPO_NAME>:ref:refs/heads/main"
      }
    }
  }]
}
```
`<AWS_ACCOUNT_ID>`, `<GITHUB_ORG>`, `<REPO_NAME>` değerlerini doldur. Önemli:
`sub` pattern'ini `main` branch'e daralttık — başka branch'ten deploy
yapılamaz.

### 3.3 Deploy role oluştur
```bash
aws iam create-role \
  --role-name PicSonarDeployRole \
  --assume-role-policy-document file://trust-policy.json \
  --profile picsonar-prod
```

### 3.4 Permissions
İlk pass için `AdministratorAccess` ekle, tam deploy çalıştıktan sonra
least-privilege'e daralt (CloudTrail'den gerçek kullanılan aksiyonları
çıkar):
```bash
aws iam attach-role-policy \
  --role-name PicSonarDeployRole \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess \
  --profile picsonar-prod
```

### 3.5 Role ARN'yi not et
Çıktıdaki `arn:aws:iam::<account>:role/PicSonarDeployRole` değerini al —
birazdan GitHub secret olarak ekleyeceksin.

---

## 4. Secrets Manager — prod secret'ları 🔴

Hiçbir gerçek secret `.env`'e commit edilmeyecek. Hepsi Secrets Manager'a.

### 4.1 JWT secret'ları üret
```bash
# 64-byte base64 secret üret — iki tane, farklı olsunlar
openssl rand -base64 64
openssl rand -base64 64
```

### 4.2 JWT secret'ını kaydet
```bash
aws secretsmanager create-secret \
  --name /picsonar/prod/jwt \
  --description "JWT signing secrets — access + refresh" \
  --secret-string '{"JWT_SECRET":"<birinci_base64>","JWT_REFRESH_SECRET":"<ikinci_base64>"}' \
  --profile picsonar-prod
```

### 4.3 Stripe secret'ını kaydet (şimdilik placeholder)
```bash
aws secretsmanager create-secret \
  --name /picsonar/prod/stripe \
  --description "Stripe live keys" \
  --secret-string '{"STRIPE_SECRET_KEY":"sk_live_PLACEHOLDER","STRIPE_WEBHOOK_SECRET":"whsec_PLACEHOLDER"}' \
  --profile picsonar-prod
```
KYC onayından sonra gerçek değerlerle `update-secret` ile güncelleyeceksin.

### 4.4 SMTP secret'ını kaydet (yine placeholder)
```bash
aws secretsmanager create-secret \
  --name /picsonar/prod/smtp \
  --description "SES SMTP credentials" \
  --secret-string '{"SMTP_USER":"PLACEHOLDER","SMTP_PASS":"PLACEHOLDER","SMTP_HOST":"email-smtp.eu-central-1.amazonaws.com","SMTP_PORT":"587"}' \
  --profile picsonar-prod
```

### 4.5 `serverless.yml` referansları
Kod zaten `${ssm:/picsonar/prod/jwt~true}` formatında çekiyor. Değişiklik
gerekmiyor.

---

## 5. SES — email gönderimi 🟡

### 5.1 Domain verify
```bash
aws ses verify-domain-identity \
  --domain picsonar.ro \
  --region eu-central-1 \
  --profile picsonar-prod
```
Çıktıdaki TXT record'u Route53'e `_amazonses.picsonar.ro` adıyla ekle.

### 5.2 DKIM aktif et
```bash
aws ses verify-domain-dkim \
  --domain picsonar.ro \
  --region eu-central-1 \
  --profile picsonar-prod
```
Çıktıdaki **3 adet** CNAME kaydını Route53'e ekle:
```
<token1>._domainkey.picsonar.ro  CNAME  <token1>.dkim.amazonses.com
<token2>._domainkey.picsonar.ro  CNAME  <token2>.dkim.amazonses.com
<token3>._domainkey.picsonar.ro  CNAME  <token3>.dkim.amazonses.com
```

### 5.3 SPF
Route53'e TXT ekle:
```
picsonar.ro  TXT  "v=spf1 include:amazonses.com ~all"
```

### 5.4 DMARC
Route53'e TXT ekle (yumuşak başla, sonra sıkılaştırırsın):
```
_dmarc.picsonar.ro  TXT  "v=DMARC1; p=none; rua=mailto:dpo@picsonar.ro; pct=100"
```

### 5.5 Sandbox'tan çık
AWS Console → SES → **Account dashboard → Request production access**. Form
gelir:
- Mail type: Transactional
- Website URL: https://picsonar.ro
- Use case description: "SaaS for event photographers. Transactional email
  only: password reset, email verification, invoice receipts,
  payment-failed alerts. Opt-in required; unsubscribe not applicable as
  these are transactional not marketing. Bounces + complaints handled via
  SES event destination to SNS."
- Additional contacts: `dpo@picsonar.ro`

Onay tipik olarak 24 saat içinde gelir. Onay gelmeden SES sadece `verified
identities`'e mail atabilir.

### 5.6 SMTP credentials üret
SES Console → **SMTP settings → Create SMTP credentials**. IAM user
yaratılır; username + password verir. Bunları **4.4**'teki secret'a yaz:
```bash
aws secretsmanager update-secret \
  --secret-id /picsonar/prod/smtp \
  --secret-string '{"SMTP_USER":"<gerçek_user>","SMTP_PASS":"<gerçek_pass>","SMTP_HOST":"email-smtp.eu-central-1.amazonaws.com","SMTP_PORT":"587"}' \
  --profile picsonar-prod
```

### 5.7 Bounces + complaints topic
```bash
aws sns create-topic \
  --name ses-bounces-prod \
  --region eu-central-1 \
  --profile picsonar-prod
```
SES Console → Configuration sets → Create → Add event destination → SNS →
Events: `Bounce`, `Complaint`. Bu topic'e `dpo@picsonar.ro` abone ol.

---

## 6. ACM — SSL sertifikaları 🟡

**İki ayrı cert lazım.** Biri API için (eu-central-1), diğeri CloudFront
için (us-east-1 zorunlu).

### 6.1 API cert (eu-central-1)
```bash
aws acm request-certificate \
  --domain-name api.picsonar.ro \
  --validation-method DNS \
  --region eu-central-1 \
  --profile picsonar-prod
```
Çıktıdaki `CertificateArn`'i not et. **Describe** ederek validation CNAME
değerlerini al:
```bash
aws acm describe-certificate \
  --certificate-arn <arn> \
  --region eu-central-1 \
  --profile picsonar-prod \
  --query 'Certificate.DomainValidationOptions'
```
Çıkan CNAME'i Route53'e ekle. ACM 5-30 dk içinde doğrular.

### 6.2 Frontend cert (us-east-1)
```bash
aws acm request-certificate \
  --domain-name picsonar.ro \
  --subject-alternative-names "www.picsonar.ro" "picsonar.com" "www.picsonar.com" \
  --validation-method DNS \
  --region us-east-1 \
  --profile picsonar-prod
```
Aynı şekilde çıkan CNAME'leri Route53'e ekle (her SAN için ayrı).

---

## 7. Frontend S3 bucket + CloudFront 🟡

### 7.1 S3 bucket
```bash
aws s3api create-bucket \
  --bucket picsonar-frontend-prod \
  --region eu-central-1 \
  --create-bucket-configuration LocationConstraint=eu-central-1 \
  --profile picsonar-prod

aws s3api put-public-access-block \
  --bucket picsonar-frontend-prod \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  --profile picsonar-prod
```

### 7.2 CloudFront Origin Access Identity
```bash
aws cloudfront create-origin-access-identity \
  --cloud-front-origin-access-identity-config \
    CallerReference=$(date +%s),Comment="picsonar-frontend" \
  --profile picsonar-prod
```
Çıkan `Id` değerini not et.

### 7.3 CloudFront distribution
AWS Console → CloudFront → Create distribution (CLI'si bulanık, console
daha pratik):
- Origin domain: `picsonar-frontend-prod.s3.eu-central-1.amazonaws.com`
- OAI: seçtiğin az önceki
- Viewer protocol policy: **Redirect HTTP to HTTPS**
- Alternate domain names: `picsonar.ro`, `www.picsonar.ro`,
  `picsonar.com`, `www.picsonar.com`
- SSL certificate: **6.2**'de oluşturduğun us-east-1 cert
- Default root object: `index.html`
- Error pages: `403 → /index.html (200)`, `404 → /index.html (200)` (SPA
  routing için)
- Price class: Use only North America and Europe (Romania kullanıcısı için
  yeterli, maliyet düşer)

### 7.4 Response Headers Policy
`docs/runbooks/edge-headers.md` dosyasındaki config'e göre policy oluştur:
- Custom headers: CSP, HSTS, X-Frame-Options, Permissions-Policy, COOP,
  CORP
- Behavior'a attach et.

### 7.5 Bucket policy — OAI okuma izni
```bash
cat > bucket-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity <OAI_ID>" },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::picsonar-frontend-prod/*"
  }]
}
EOF

aws s3api put-bucket-policy \
  --bucket picsonar-frontend-prod \
  --policy file://bucket-policy.json \
  --profile picsonar-prod
```

### 7.6 Distribution ID'yi not et
`E1XXXXXXXXXXXX` formatında. Birazdan GitHub secret olacak.

### 7.7 Route53 alias kayıtları
Route53 Console → Hosted zones → `picsonar.ro` → Create record:
- Record name: boş (apex)
- Record type: A
- Alias: **Yes** → Route traffic to CloudFront distribution
- Aynı şeyi `www` için tekrarla.
- `picsonar.com` ve `www.picsonar.com` için 301-redirect kur (başka bir
  CloudFront veya S3 website + static redirect).

---

## 8. Backend API Gateway custom domain 🟡

### 8.1 Custom domain
```bash
aws apigateway create-domain-name \
  --domain-name api.picsonar.ro \
  --regional-certificate-arn <api_cert_arn_from_6.1> \
  --endpoint-configuration types=REGIONAL \
  --security-policy TLS_1_2 \
  --region eu-central-1 \
  --profile picsonar-prod
```

### 8.2 Base path mapping
İlk deploy sonrası API ID bilineceği için bu adımı deploy sonrasına ertele.

### 8.3 Route53 alias
Distribution target CNAME'ini al (`describe-domain-name` çıktısındaki
`regionalDomainName`) ve Route53'te `api.picsonar.ro` için alias (A)
kaydı oluştur.

---

## 9. SNS alarm subscription 🟢

CloudWatch alarms zaten `picsonar-alarms-prod` topic'ine gidiyor
(`backend/serverless.yml`). Sadece abone ekle:
```bash
aws sns subscribe \
  --topic-arn arn:aws:sns:eu-central-1:<account>:picsonar-alarms-prod \
  --protocol email \
  --notification-endpoint operations@picsonar.ro \
  --region eu-central-1 \
  --profile picsonar-prod
```
Gelen confirm mailini tıkla.

Opsiyonel: PagerDuty integration varsa HTTPS protokol + PD endpoint URL ile
ekle.

---

## 10. Stripe 🔴

### 10.1 Hesap aç + KYC
- https://dashboard.stripe.com/register
- Country: Romania
- Business type: Company (SRL) veya Individual (PFA)
- CUI, ONRC, IBAN, yasal adres, sahiplik yapısı (≥ %25 hissedarlar).
- Kimlik + vergi belgesi upload.
- Onay 48-72 saat.

### 10.2 Stripe Tax aktif et
Dashboard → **Tax → Activate**. Romania 19% standard rate otomatik ekleniyor.
Tax ID format: `RO<CUI>`.

### 10.3 Live mode secret key'leri al
Dashboard → Developers → API keys → **Reveal live key**. `sk_live_...` değerini
Secrets Manager'a (adım 4.3) yaz:
```bash
aws secretsmanager update-secret \
  --secret-id /picsonar/prod/stripe \
  --secret-string '{"STRIPE_SECRET_KEY":"sk_live_<real>","STRIPE_WEBHOOK_SECRET":"whsec_PLACEHOLDER"}' \
  --profile picsonar-prod
```
Webhook secret'ı birazdan doldurulacak.

### 10.4 Webhook endpoint
**İlk deploy sonrası** (adım 14) yap — API URL'i lazım. Sonraki sırada:
- Dashboard → Developers → Webhooks → **Add endpoint**
- URL: `https://api.picsonar.ro/webhook/stripe`
- Events:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `charge.refunded`
  - `charge.dispute.created`
- Reveal signing secret (`whsec_...`), Secrets Manager'daki
  `STRIPE_WEBHOOK_SECRET` alanını güncelle, Lambda'yı redeploy et.

### 10.5 Wallet ödemeleri — **açılmayacak**
Ürün kararı: **sadece kart kabul ediyoruz**. Apple Pay, Google Pay, Link ve
SEPA debit kapalı kalacak. Pratik sebepler:
- Apple Pay domain-association dosyası + Apple Merchant ID kayıt süreci
  yok.
- Muhasebecinin Stripe payout CSV'sini ayrıştırması daha basit kalır
  (tek `payment_method_type` kolonu = `card`).
- Kod tarafında `createPaymentIntent.ts` `payment_method_types: ['card']`
  ile hard-lock edildi; Stripe Dashboard'daki "enable wallet" toggle'ları
  kullanıcıyı etkilemez.

Eylem: Stripe Dashboard → Settings → Payment methods'ta Apple Pay, Google
Pay, Link ve SEPA satırlarının **OFF** olduğunu bir kez doğrula; başka bir
şey yapma.

### 10.6 Statement descriptor
Dashboard → Settings → Branding → **Public business name**: `PICSONAR`
(sadece büyük harf, boşluk yok, max 22 char). Banka extresinde böyle görünür.

### 10.8 Radar fraud rules
Dashboard → Radar → Rules:
- `:risk_level: = 'highest'` → Block
- `:risk_level: = 'elevated'` → Require 3D Secure
- Launch için default rules yeterli; 30 gün data toplandıktan sonra
  sıkılaştır.

### 10.9 Receipt emails
Dashboard → Settings → Emails → **Customer emails for successful payments**
açık olmalı (Stripe'ın kendi recepit'ini yollar; bizim email template'imize
ek olarak).

---

## 11. Legal sayfaları doldur 🔴

Footer'daki `<TODO>` placeholder'ları **ANPC denetiminde ceza sebebi**.
Aşağıdaki dosyaları düzenle:

### 11.1 `frontend/src/components/Footer.tsx`
`<TODO>` geçen yerleri aç, yerine gerçek değerleri yaz:
- `RO<TODO>` → `RO45123456` (gerçek CUI)
- `J40/<TODO>/<TODO>` → `J40/1234/2024` (gerçek ONRC)
- Şirket adı, adres, iletişim mail'i.

### 11.2 `/privacy`, `/terms`, `/dpa`, `/consumer-rights` sayfaları
`frontend/src/pages/` altındaki PrivacyPage, TermsPage, DPAPage,
ConsumerRightsPage dosyalarını aç. Şu anda placeholder içerik olabilir;
Romanya GDPR avukatından aldığın gerçek metni oraya yapıştır. Dikkat:
- **Privacy:** GDPR Art. 13 + 14 bilgilendirmesi, biyometrik işlemenin
  meşru dayanağı (Art. 9(2)(a) açık rıza), retention süreleri, Veri
  Sorumlusu + DPO iletişimi.
- **Terms:** hizmet tanımı, fiyatlar, OUG 34/2014 art. 16(m) — dijital
  içerik cayma hakkı muafiyeti, ödeme + fatura + uyuşmazlık maddeleri.
- **DPA:** B2B müşterilere karşı veri işleyici rolünü ve Standard
  Contractual Clauses referansını içerir.
- **Consumer Rights:** sayfa zaten RO içerikle mevcut; sadece şirket
  bilgilerinin doğru olduğunu doğrula.

### 11.3 Avukat reviewi 🔴
Romanya'da GDPR + OUG 34/2014 uzmanı bir avukata tüm 4 sayfayı gözden
geçirt. Tahmini ücret: 500-1500 EUR. Bu olmadan canlıya açmak ciddi
regulatory risk.

### 11.4 DPO (Data Protection Officer) atama
Biyometrik veri + "büyük ölçekli sistematik işleme" çerçevesinde GDPR Art.
37(1)(b)-(c) gereği DPO gerekiyor olabilir. Avukatına sor. DPO iç veya dış
olabilir, ANSPDCP'ye bildirilir.

### 11.5 ANPC distance-selling kaydı
ANPC'ye "comerciant la distanță" olarak kaydını doğrula. Muhasebeciye
sor; çoğu SRL'de otomatik olur ama biyometrik servis için ek kayıt
isteyebilirler.

---

## 12. GitHub Actions secrets 🟢

Repo → Settings → Secrets and variables → **Actions → New repository
secret** ile şu değerleri ekle:

| Secret adı | Değer |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | 3.5'teki role ARN |
| `AWS_REGION` | `eu-central-1` |
| `CLOUDFRONT_DISTRIBUTION_ID` | 7.6'daki ID |
| `FRONTEND_S3_BUCKET` | `picsonar-frontend-prod` |
| `STAGING_API_URL` | (staging deploy sonrası) |
| `PROD_API_URL` | `https://api.picsonar.ro` |

Environments → **prod** environment yarat, required reviewers olarak
kendini ekle. `.github/workflows/deploy.yml` zaten `environment: prod`
referansı içeriyor.

---

## 13. İlk staging deploy 🟡

Prod'a direkt gitme. Önce staging.

### 13.1 Staging secret'ları
3 numaralı secret'ları bir de `/picsonar/staging/...` prefiksi ile oluştur.
Stripe **test key**'i (`sk_test_...`) kullan.

### 13.2 Staging deploy
```bash
git checkout main
git pull
# workflow_dispatch ile tetikle:
gh workflow run deploy.yml -f stage=staging
gh run watch
```

### 13.3 Smoke test
- https://staging.picsonar.ro açıl, register → email verify mail geliyor mu?
- Reset password → mail geliyor mu?
- Event oluştur → upload photo → match face → Stripe test card
  `4242 4242 4242 4242` ile ödeme yap → invoice PDF mail'de geliyor mu?
- `docs/runbooks/smoke-tests.md` varsa onu izle, yoksa bu 4 adımı manuel
  yap.

### 13.4 CloudWatch Logs
`aws logs tail /aws/lambda/picsonar-backend-staging-auth-login --follow
--profile picsonar-prod` ile canlı log akışını izle, hata görürsen düzelt.

---

## 14. Prod deploy 🔴

### 14.1 Son gözden geçirme checklist
- [ ] Stripe KYC onaylandı, live keys Secrets Manager'da.
- [ ] SES prod access onaylandı.
- [ ] ACM cert'ler `ISSUED` durumunda.
- [ ] CloudFront distribution `Deployed` durumunda.
- [ ] Route53'te tüm alias'lar aktif.
- [ ] Footer'daki `<TODO>` değerler gerçek.
- [ ] `/privacy`, `/terms`, `/dpa` sayfaları avukat-onaylı içerikle dolu.
- [ ] GitHub secrets set.
- [ ] Backup & monitoring alarm subscription onaylı.

### 14.2 Deploy
```bash
gh workflow run deploy.yml -f stage=prod
# Required reviewer olarak onay ver
gh run watch
```

### 14.3 API Gateway base path mapping
Deploy bitince API ID belli olur. Adım 8.2'yi şimdi tamamla:
```bash
aws apigateway create-base-path-mapping \
  --domain-name api.picsonar.ro \
  --rest-api-id <api_id> \
  --stage prod \
  --region eu-central-1 \
  --profile picsonar-prod
```

### 14.4 Stripe webhook endpoint kaydet (adım 10.4)
Artık `https://api.picsonar.ro/webhook/stripe` çalışıyor. Stripe
dashboard'dan endpoint'i ekle, `whsec_...` değerini Secrets Manager'daki
`/picsonar/prod/stripe` içine yaz, Lambda'yı redeploy et (küçük sync):
```bash
cd backend && npx serverless deploy --stage prod \
  --region eu-central-1 --aws-profile picsonar-prod
```

### 14.5 Rekognition collection bootstrap
```bash
aws rekognition create-collection \
  --collection-id picsonar-faces-prod \
  --region eu-central-1 \
  --profile picsonar-prod
```
(Deploy workflow bunu zaten yapar, idempotent — yine de doğrula.)

### 14.6 Prod smoke test
`https://picsonar.ro` → register → verify email → tek bir olay yarat → 1
fotoğraf upload → 1 eşleşme → Stripe test kartı ile ödeme → invoice
teslimi. Tam döngü 10 dakika sürmeli.

### 14.7 DNS sorunları için
`dig picsonar.ro`, `dig api.picsonar.ro CNAME`,
`curl -v https://api.picsonar.ro/healthcheck` ile katman katman kontrol et.

---

## 15. Prod-sonrası ilk 24 saat 🟡

### 15.1 CloudWatch dashboard aç
AWS Console → CloudWatch → Dashboards → `picsonar-prod`. Şu widget'ları
ekle:
- API Gateway 5xx count
- API Gateway p99 latency
- Lambda error count (tüm fonksiyonlar)
- DynamoDB throttles
- SES bounce + complaint rate
- Stripe webhook success/failure (CloudWatch Logs metric filter)

### 15.2 Bounce + complaint ilk taraması
İlk 24 saatte SES bounce > %5 veya complaint > %0.1 olursa SES senin
identity'yi pause eder. `ses-bounces-prod` SNS topic'ine gelen mailleri
izle; suspicious address'leri temizle.

### 15.3 Prod'u dar bir gruba aç
Launch day'i Reddit + ProductHunt'a duyurma. Önce 10-20 güvendiğin event
fotoğrafçısına ve kendi küçük komünitene yolla. 48 saat boyunca sadece
onlar kullansın. Hata bulurlarsa ucuz düzelt.

### 15.4 İlk rotation pratiği
`docs/runbooks/secret-rotation.md`'yi aç, JWT secret'ını gerçek bir
rotation ile test et. Test senaryosu: secret'ı Secrets Manager'da güncelle,
Lambda concurrent execution'u bitince yeni secret devreye girer, access
token'lar fail olur ama frontend refresh-on-401 ile kendini toparlar.

---

## 16. 30 gün içinde yapılacaklar 🟢

- **Sentry DSN al** (`sentry.io`) → `SAAS_BACKLOG.md` §Observability →
  frontend + backend forwarding kodu zaten hazır, sadece `SENTRY_DSN`
  secret'ı + init çağrısı aktif et.
- **SAAS_BACKLOG.md** §"Transactional email suite"'i tamamla: welcome
  email, password-changed alert, event-processing-complete, pre-expiry
  warning, refund confirmation.
- **`react-helmet-async`** ile per-page meta tags (SEO + OG cards).
- **`/profile`** sayfasına "Hesabımı sil" + "Verilerimi indir" butonları
  (backend endpoint'leri zaten canlı).
- **Unverified-email dashboard banner'ı** — paid flows zaten bloke ama UX
  iyileşir.
- **Stripe webhook replay runbook'u** yaz ve bir test replay yap.
- **DMARC policy sıkılaştır**: `p=none` → `p=quarantine` (7 gün sonra)
  → `p=reject` (30 gün sonra), DMARC report'ları okuyarak.

---

## 17. 90 gün içinde yapılacaklar 🟡

- **DPIA (Data Protection Impact Assessment)** — biyometrik işleme için
  GDPR Art. 35 gereği. Avukatın veya DPO'n hazırlar. Şablon: CNIL PIA
  tool.
- **ANSPDCP** bildirimi / danışma (gerekirse). DPIA çıktısına göre.
- **Scheduled purge Lambda** (`SAAS_BACKLOG.md` §Infra & ops) — soft-
  deleted hesapları otomatik temizle.
- **GDPR audit log tablosu** — silme + export talebi kanıtı.
- **Load test** (k6 / Artillery) — staging'de 100 concurrent user + 1000
  photo upload/saat simülasyonu.
- **Accessibility** — axe-core Playwright suite'e ekle.
- **httpOnly refresh cookie'lere geçiş** — refresh token'ı memory'den
  `Secure; HttpOnly; SameSite=Lax` cookie'ye taşı. XSS blast radius
  küçülür.
- **CloudFront signed cookies** for `/invoices/*` — time-limited PDF
  erişimi.

---

## 18. Operasyon ritmi — ayda bir yapacakların

### 18.1 Finansal close (her ayın 1-5'i arası)
1. Stripe Dashboard → Payouts → "CSV export" seç, geçen ay aralığı.
2. Aynı menüde "Invoices" CSV'si + "Balance transactions" CSV'si.
3. Bu 3 dosyayı muhasebeciye WeTransfer/email ile yolla.
4. Muhasebeci SPV paneline e-Factura'ları yükler.
5. Muhasebeci + 1 dosya geri yollar: "ANAF alındı" PDF'leri. `D3`, `D394`
   beyannameleri dahil.

### 18.2 Secret rotation (her ayın 15'i)
JWT_SECRET + JWT_REFRESH_SECRET'i rotate et (`secret-rotation.md` §1). SMTP
pass'i rotate et (SES SMTP credentials yeniden üret, §1 kayıtları
güncelle).

### 18.3 Güvenlik gözden geçirme
- GitHub Dependabot alert'lerini temizle.
- CodeQL bulgularına bak.
- CloudTrail log'unda anormal IAM aksiyonu ara.
- SES bounce/complaint oranı sağlıklı mı?
- DynamoDB PITR aktif + son backup timestamp güncel mi?

---

## 19. Acil durum playbook'u

### 19.1 "Prod API down"
1. CloudWatch alarm Slack/email'ine bakın, hangi fonksiyon?
2. `aws logs tail /aws/lambda/<fn> --follow` — son 5 dk trace.
3. DynamoDB throttle mu? PAY_PER_REQUEST olduğu için olmamalı ama adaptive
   capacity ramp-up olabilir.
4. Secrets Manager 503 mü? Rare; bir önceki secret version'a fallback.
5. Hızlı rollback: `npx serverless rollback --timestamp <last_good> --stage
   prod`.

### 19.2 "Stripe webhook fail"
1. Stripe Dashboard → Webhooks → event → "Resend". Kod idempotent.
2. Tekrar fail ederse payload'u al, manual `invoke-local` ile Lambda'yı
   dene.
3. Son çare: muhasebeciye Stripe CSV'den fatura bilgisini yolla, manuel
   hesaba kredi ekleme scripti çalıştır (`backend/scripts/apply-credit.ts`,
   hala mevcut değilse yaz).

### 19.3 "GDPR silme talebi geldi"
1. `POST /auth/delete-account` endpoint'i zaten var, user kendi self-
   serve ile yapabilir.
2. Email ile gelirse: user ID'yi bul, sen admin jwt'si ile aynı endpoint'i
   tetikle, 30 gün sonra purge.
3. Audit log'a kaydet: "silme talebi alındı, onaylandı, purgeAt = X".

### 19.4 "ANAF denetim maili"
1. Panik etme.
2. Muhasebeciyi ara. SPV panelinde tüm son 5 yıl fatura mevcut olmalı.
3. Fiskal retention gereği `InvoicesBucket`'taki PDF'ler 5 yıl duruyor;
   bucket lifecycle zaten bunu garanti ediyor.
4. Ek olarak Stripe Dashboard → Payments → date range filter → PDF
   export ile ikinci nüshayı üret.

---

## 20. Referans kaynaklar

- Mevcut runbook'lar: `docs/runbooks/{secret-rotation,git-history-cleanup,edge-headers}.md`
- Ertelenen işler: `docs/SAAS_BACKLOG.md`
- Prod hazırlık durumu: `docs/PRODUCTION_READINESS_STATUS.md`
- Stripe Romanya dokümanı: https://stripe.com/en-ro/resources
- ANAF SPV: https://www.anaf.ro/spv
- ANPC: https://anpc.ro
- ANSPDCP: https://www.dataprotection.ro
- AWS SES best practices: https://docs.aws.amazon.com/ses/latest/dg/best-practices.html
- CloudFront Response Headers Policy: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/response-headers-policies.html

---

**Son tavsiye:** Bu listeyi ikiye böl — "bu hafta" (1-10) + "önümüzdeki
hafta" (11-14) + "launch sonrası" (15+). Hepsini aynı anda yapmaya çalışma,
hata yapma olasılığın fırlar. Stripe KYC ve SES prod access bekleme süresi
paralelde işlediği için onları en önce başlat ki gün kaybetmeyelim.
