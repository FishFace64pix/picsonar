# EventFaceMatch / PicSonar — Kapsamlı Teknik Denetim Raporu

**Denetim Tarihi:** 17 Nisan 2026
**Denetçi:** Senior Software Engineer & Code Auditor
**Proje:** AI-Powered Event Photo Delivery System (SaaS)
**Stack:** React 18 + TypeScript + Vite + Tailwind (FE) / AWS Lambda + Serverless + DynamoDB + S3 + Rekognition + Stripe + Netopia (BE) / Terraform (IaC)

---

## YÖNETİCİ ÖZETİ

Proje, yüz tanıma tabanlı etkinlik fotoğrafı dağıtım ürünüdür. Fonksiyonel olarak zengin (auth, admin paneli, ödeme, KVKK/GDPR, QR flow, i18n) ancak **production'a hazır değildir**. En çok 7 kritik sınıf sorun vardır: (1) zayıf parola hashleme (SHA-256), (2) kırık JWT doğrulaması, (3) committed secret'lar, (4) Terraform/Serverless çift-yönetim çakışması, (5) eksik IDOR kontrolleri, (6) DynamoDB pagination yokluğu, (7) yok denecek kadar az test coverage. Aşağıdaki tüm bulgular gerçek production projesinde ship-blocker sayılır.

---

## 1. KOD KALİTESİ ANALİZİ

### 1.1 Bad Practices

**Backend**
- `backend/functions/auth/register.ts:55`, `login.ts:35`, `resetPassword.ts:45` — Parola `crypto.createHash('sha256').update(password).digest('hex')` ile hashleniyor. Salt yok, iterasyon yok. Rainbow-table ve GPU brute-force saldırılarına tamamen açık.
- `backend/src/utils/jwt.ts:3` ve `backend/serverless.yml:32` — `JWT_SECRET || 'dev-secret-change-in-production'`. Prod'da env set edilmezse güvensiz default kullanılır; deployment-time doğrulama yok.
- `backend/functions/createOrder.ts:19` — `const [userId] = token.split(':')`. Bu JWT doğrulaması değildir. Herhangi bir string gönderen istemci sipariş oluşturabilir. Diğer handler'larda `verifyToken` kullanılırken bu handler "fake auth" ile yazılmış.
- `backend/functions/auth/register.ts:32`, `createEvent.ts:34,58`, `src/utils/rekognition.ts:101,110` — Handler içinde `require(...)` ile dinamik import. Tutarsız ve tree-shake'lenemiyor.
- `backend/functions/payment/stripeWebhook.ts:10` — `const Stripe = StripeConstructor as any`. `any` cast.
- `backend/functions/payment/netopiaWebhook.ts:39-52` — `// MOCK DECRYPTION` yorumuyla Netopia RSA/RC4 decryption hiç implement edilmemiş. Bu dosya prod'da ödeme doğrulayamaz.
- `backend/functions/admin/*` — 8 farklı admin handler'da admin-kontrol bloğu copy-paste. `requireAdmin(event)` util'ına çekilmeli.

**Frontend**
- `frontend/src/pages/EventPage.tsx:40` — `// @ts-ignore` + `eventsApi.getEventPhotos ? eventsApi.getEventPhotos(eventId) : Promise.resolve([])`. Type sistemi by-pass ediliyor.
- `frontend/src/pages/CheckoutPage.tsx` — `any` tipli prop'lar ve `stripe.confirmCardPayment` (deprecated — modern SDK `confirmPayment` ile Payment Element).
- `frontend/src/api/auth.ts`, `components/PhotoUpload.tsx` — Production bundle'a kaçacak `console.log`'lar (`USE_MOCK` değeri dahil).
- `frontend/src/pages/DashboardPage.tsx:168`, `EventPage.tsx:81`, `admin/AdminUsersPage.tsx:26` — `alert()` / `confirm()` / `window.confirm()` kullanımı. Modal sistemi zaten var, tutarsız UX.
- `frontend/src/contexts/AuthContext.tsx:20-55` — `localStorage.setItem('authToken', token)` ve `localStorage.setItem('user', JSON.stringify(user))`. XSS durumunda tam sessiyon kaçışı.

**Genel**
- Root'ta `tmp_check.js`, `tmp_fix.js` gibi scratch dosyaları.
- `backend/`'de `deploy_output.txt`, `deploy_output2.txt`, `deploy_output3.txt`, `logs.txt`, `awslogs.txt`, `payload.json`, `response.json`, `out.json`, `aws_events.json`, `update-*.json` — deployment artifact'leri commit edilmiş.
- `backend/.serverless/` klasörü commit edilmiş (~2.7 MB; `cloudformation-template-*.json`, `serverless-state.json`, `eventfacematch-backend.zip`). `.gitignore` sonradan eklenmiş ama geçmiş kirli.

### 1.2 Tekrar Eden / Kullanılmayan Kod

- `backend/src/utils/validateCUI.ts` ve `frontend/src/utils/validateCUI.ts` — **aynı kod iki yerde** kopya. Shared package'a çıkarılmalı.
- `backend/src/constants/packages.ts` ve `frontend/src/constants/packages.ts` — SKU / fiyat listesi her iki tarafta ayrı tutuluyor. İki yerden biri güncellenmezse fiyat uyumsuzluğu / ödeme hatası.
- `backend/serverless.yml:290-291` (`createNetopiaPayment`) ve `serverless.yml:332-333` (`netopiaWebhook`) — handler tanımları boş satırla kesilmiş; fonksiyonlar deploy edilmiyor ama dosyalar mevcut.
- `frontend/tsc_output.txt`, `tsc_output2.txt` — tsc çıktıları commit edilmiş.
- 12+ root-level Markdown dosyası (`README.md`, `QUICKSTART.md`, `KURULUM_REHBERI.md`, `PROJE_DOKUMANTASYONU.md`, `COMPLETE_PROJECT_DOCUMENTATION.md`, `PROJECT_IMPROVEMENT_REPORT.md`, `TEMIZLIK_RAPORU.md`, `KULLANIM_KILAVUZU.md`, `MUSTERI_REHBERI.md`, `DEPLOYMENT.md`, vb.) — aynı içerikler tekrar tekrar, Türkçe + İngilizce + Romence karışık. Kanonik kaynak belirsiz.

### 1.3 Okunabilirlik / Sürdürülebilirlik / Tutarlılık

- Handler'lar 150–300 satır arası; auth + business + persistence sorumlulukları aynı fonksiyonda. Service katmanı yok.
- `frontend/src/pages/DashboardPage.tsx` ~330 satır, `GuestScanPage.tsx` ~280 satır, `EventPage.tsx` ~260 satır. Sub-component ve hook ayrımı yok.
- `frontend/src/components/PhotoUpload.tsx` — drag-drop + compression + upload state'i tek dosyada; `useUploadQueue` hook'una çekilmeli.
- Error handling tutarsız: bazı handler `return errorResponse(...)`, bazısı `throw new Error(...)`, bazısı silent-swallow (`stripeWebhook.ts:156`, `deletePhoto.ts:67-72`).

### 1.4 Temiz / Optimize Alternatifler

- Parola: `bcryptjs` (cost 10–12) veya `argon2id`.
- Auth/JWT: tüm handler'larda `verifyAuthHeader(event)` util'i; `serverless.yml` içinde custom authorizer (Lambda authorizer) ile API Gateway seviyesinde merkezî doğrulama.
- Input validation: `zod` zaten dependency. `validation.ts`'i genişletip her handler için `schema.parse(body)` zorunlu hale getirin.
- DynamoDB: `scanTable` ve `queryItems` util'larına pagination (LastEvaluatedKey loop veya AsyncGenerator) ekleyin.
- Frontend: `React.lazy` + `Suspense` ile route-level code splitting; form'larda `react-hook-form` + `zod` resolver.

---

## 2. KRİTİK HATALAR & BUG ANALİZİ

### CRITICAL

| # | Bulgu | Konum | Etki |
|---|-------|-------|------|
| C1 | SHA-256 parola hashing (salt yok, iterasyon yok) | `auth/register.ts:55`, `login.ts:35`, `resetPassword.ts:45` | Tüm kullanıcı parolaları leak durumunda anında kırılabilir. |
| C2 | JWT doğrulama kırık: `token.split(':')` ile user ID çıkarma | `functions/createOrder.ts:19` | Herhangi biri başkası adına sipariş oluşturabilir; ödeme/kredi manipülasyonu. |
| C3 | `.env` içinde SMTP şifresi + Stripe anahtarı commit edilmiş | `backend/.env`, git history | Tüm secret'ların rotasyonu gerekiyor. |
| C4 | `JWT_SECRET` default değeri production'da çalışabilir | `jwt.ts:3`, `serverless.yml:32` | Token forging mümkün olur. |
| C5 | Netopia webhook gerçek decryption yok (mock) | `payment/netopiaWebhook.ts:39-52` | Sahte webhook ile kredi şişirme. |
| C6 | Terraform ve Serverless aynı DynamoDB tablolarını yönetiyor | `aws/dynamodb-tables.tf` vs `serverless.yml:428-631` | State drift → prod kesintisi. |
| C7 | `.serverless/` klasörü + CloudFormation state commit edilmiş | `backend/.serverless/` | Dahili AWS metadata'sı açıkta. |

### HIGH

| # | Bulgu | Konum | Etki |
|---|-------|-------|------|
| H1 | IDOR — event/photo/face GET'lerinde ownership kontrolü yok | `getEvent.ts`, `getEventPhotos.ts:20-25`, `getEventFaces.ts:17-22` | Diğer müşterilerin fotoğrafları tahmin edilen eventId ile listelenebilir. |
| H2 | S3 CORS wildcard (`AllowedOrigins: ["*"]`) | `backend/cors.json` | Herhangi bir origin S3'e PUT yapabilir. |
| H3 | Rekognition IAM `Resource: "*"` | `serverless.yml:82` | Least-privilege ihlali; başka koleksiyonlara erişim. |
| H4 | File upload: MIME-type sadece string include, size limiti yok | `uploadPhoto.ts:40,56`, `matchFace.ts:77` | Maliyet/DoS ve zararlı içerik yükleme. |
| H5 | Rate limit in-memory (Lambda instance scope) | `matchFace.ts:12-32` | Yok sayılabilir; real limit yok. |
| H6 | `scanTable` pagination yok; 1MB üstü sessiz kesiliyor | `src/utils/dynamodb.ts:63-68`, `admin/getUsers.ts:19`, `admin/getAdminStats.ts` | Admin raporları eksik; 1K+ kullanıcıda yanlış sayılar. |
| H7 | Kredi düşme race condition (conditional expression yok) | `createEvent.ts:59`, `uploadPhoto.ts:78` | Eşzamanlı istekte negatif kredi. |
| H8 | CloudFront `forwarded_values` deprecated, custom domain SSL config commented | `aws/cloudfront.tf:41-65,80-85` | Terraform plan uyarısı, branding eksik. |
| H9 | CI/CD sadece test/build; deploy job yok | `.github/workflows/main.yml` | Manuel deploy → insan hatası. |
| H10 | Bucket isim uyuşmazlığı: serverless `-x92k` suffix, Terraform yok | `serverless.yml:106-107` vs `aws/s3-buckets.tf:19` | Cross-stack deployment bozulur. |
| H11 | `us-east-1` (Terraform default) vs `eu-central-1` (serverless) | `main.tf:18`, `serverless.yml:11` | KVKK/GDPR uyumluluk + latency problemi. |
| H12 | `localStorage` içinde JWT | `contexts/AuthContext.tsx:20-25` | Herhangi bir XSS ile session kaçışı. |
| H13 | Admin yetki kontrolü sadece FE'de | `layouts/AdminLayout.tsx:17` | Backend endpoint'lerine doğrudan istekle admin rolü by-pass edilebilir (bkz. H1). |
| H14 | Stripe deprecated `confirmCardPayment` | `pages/CheckoutPage.tsx:44` | SCA/3DS akışı modern Payment Element'in garantilerini almıyor. |

### MEDIUM

- M1 `Math.round(totalAmountRON * 100)` ile float-precision bani kaybı — `payment/createPaymentIntent.ts:93`. `Decimal` / tam sayı bani saklanmalı.
- M2 `processPhoto.ts:61` — `Jimp.read(await getSignedUrlForDownload(...,300))`; signed URL expiry ile download süresi arası race.
- M3 `processPhoto.ts:102-103` — `faces: 0` ve `photos: 1` hardcoded; atomic counter değil, yarış durumunda photo sayacı yanlış.
- M4 N+1 fetch: `matchFace.ts:137-141` her photoId için ayrı `getItem` — `BatchGetItem` kullanılmalı.
- M5 Tüm GSI'ler `ProjectionType: ALL` — depolama x2-3, maliyet artışı.
- M6 DynamoDB tablolarında sort key + `createdAt` GSI yok; "son 100 fotoğraf" vb. query'ler verimsiz.
- M7 `ErrorBoundary` sadece `main.tsx`'te root'ta; per-route boundary yok.
- M8 i18n Türkçe desteği repo'da bahsedilmiş ama `supportedLngs: ['en','ro']` — eksik locale.
- M9 Modal'larda ESC kapatma ve focus-trap yok (`BuyExtraEventModal`, `OrderHistoryModal` vb.).
- M10 Form label'ları `htmlFor` ile input'a bağlı değil (`LoginPage.tsx:49` vb.) — a11y.
- M11 Webhook failure'ları silent swallow — Stripe invoice oluşturma hatasında sadece console.error, retry/DLQ yok.
- M12 `user.name`, `user.email` plain `localStorage`'a — PII'nin client-side saklanması minimize edilmeli.
- M13 CloudWatch tracing açık (`serverless.yml:15-17`) ama custom metric / correlation ID yok.
- M14 S3 raw-photos için OAI var ama yine de doğrudan S3 URL'si imzalı link olarak frontend'e döndürülüyor (CloudFront by-pass edilebilir).

### LOW

- L1 `sourcemap: true` production Vite build'inde — iç kaynak sızıntısı.
- L2 `vite.config.ts`'de `VITE_USE_MOCK` değiştirilmeden mock store `localStorage`'da kalıcı — gerçek veriyle karışabilir.
- L3 `robots.txt` default — SaaS için `/dashboard`, `/admin` explicit disallow eklenmeli.
- L4 React Query `staleTime` 5 dk — foto listesi için çok uzun, invalidation da çağrılmıyor.
- L5 `useEffect` bağımlılık listesi eksiklikleri (`AuthContext.tsx:31`).
- L6 Console log'lar, `console.log('Mock Mode is:', ...)` gibi ifşalar (auth.ts).

---

## 3. MİMARİ VE PROJE YAPISI

**Mevcut Durum**
- Monorepo (`workspaces: [frontend, backend]`). `frontend` React SPA, `backend` Serverless Framework v3 üzerinde 36 Lambda handler, `aws/` Terraform, `scripts/` yardımcılar.
- Backend: `functions/` handler'lar + `src/utils` yardımcılar; service katmanı yok.
- Frontend: `pages/` + `components/` + `contexts/` + `api/` + `utils/`; feature-based değil, tip-based.

**Sorunlar**
- **Çift IaC kaynağı** (Terraform + Serverless CFN) → tek doğru kaynak (SSOT) belirlenmeli. Öneri: S3, CloudFront, IAM rol'ü = Terraform; Lambda, API Gateway, DynamoDB (app tablolar) = Serverless. Ya da tamamen AWS CDK'ya geçiş.
- **Service layer yok**: handler = controller + service + repository. `src/services/{auth,payments,events,faces}.ts` + `src/repositories/*Repository.ts` ayrımı.
- **Shared kod yok**: `validateCUI`, `packages`, tip tanımları iki yerde duplike. Öneri: kök seviyede `packages/shared/` workspace paketi.
- **Ölçeklenebilirlik**: admin raporları hep full-scan. Aggregation için `system-stats` tablosuna DynamoDB Streams + Lambda ile gerçek-zamanlı counter yazımı.
- **Modülerlik**: frontend sayfa başına 250–330 satır; `features/events/{hooks,components,pages}`, `features/checkout/...` yapısına bölünmeli.
- **Event-driven eksikleri**: `processPhoto` S3 event'iyle tetikleniyor ama DLQ sadece tanımlı (`serverless.yml:679-683`), on-failure wiring + alarm eksik.

**Önerilen Hedef Mimari**
```
/packages
  /shared              (zod şemaları, CUI, paket fiyatları, tipler)
/frontend
  /src
    /features/events   (hook + component + page)
    /features/admin
    /features/checkout
    /lib               (apiClient, auth, i18n)
    /ui                (primitives + shadcn benzeri)
/backend
  /src
    /handlers          (ince controller'lar)
    /services
    /repositories
    /domain            (entity + zod)
    /infra             (dynamo, s3, rekognition, stripe clients)
/infra                 (tek IaC: Terraform veya CDK)
```

---

## 4. UI/UX ANALİZİ

**Güçlü Yanlar**
- Tailwind tutarlı renk paleti ve `input-field`, `btn-*` gibi utility class'lar tanımlanmış.
- Responsive navbar + mobile menu mevcut.
- i18n altyapısı hazır (EN / RO).

**Sorunlar**
- **Hiyerarşi**: Dashboard'da başlık + istatistik + tablo tek kart içinde sıkıştırılmış; H1/H2/H3 hiyerarşisi belirsiz, Sunday reading test fail.
- **Spacing**: Pages arası padding farklı (`p-4`, `p-6`, `p-8` karışık). Tasarım token'ı yok.
- **Loading states**: `react-query` var ama skeleton loader yok; spinner bile sayfaların yarısında eksik.
- **Empty states**: "Henüz etkinlik yok" gibi boş durumlar ya yok ya sadece metin. CTA eksik.
- **Error states**: API hatası tost mesajı yerine `alert()` veya sessiz fail.
- **Form UX**: inline validation yok, submit sonrası generic error. `react-hook-form` + field-level error mesajları uygulanmalı.
- **Accessibility**: SVG icon'lar `aria-label` yok (`GuestScanPage.tsx:128` vb.), label-input bağlantısı eksik, modal'larda focus trap yok, ESC kapatma yok, kontrast oranları Tailwind `gray-400` gibi yerlerde WCAG AA altında.
- **Mobile UX**: Fotoğraf yükleme / webcam sayfası mobilde dikey kısıtlı — `object-cover` + aspect ratio kısıtı yok.
- **Onboarding**: Landing → Register → Dashboard geçişinde ilk etkinlik oluşturma wizard'ı yok; kullanıcı krediye şaşırıyor.
- **i18n**: `README` Türkçe, app arayüzü EN/RO; tutarsız. TR hedef pazar mı değil mi belirsiz.
- **Destructive action**: `confirm()` yerine "Tekrar yazarak onayla" modali (çoğu SaaS böyle) eksik — kazara event silme riski.

**Modern Öneriler**
- Shadcn/ui veya Radix UI primitives (Dialog, Toast, Dropdown) → erişilebilirlik ücretsiz gelir.
- Tasarım token'ları (`tailwind.config.js theme.extend.colors`): primary, surface, muted, danger.
- `react-hot-toast` veya Sonner ile unified feedback.
- `next-themes` benzeri yaklaşımla açık/koyu tema.
- Empty state illüstrasyonları + "İlk etkinliğini oluştur" onboarding CTA.
- Stripe Payment Element ile saved-cards + Apple/Google Pay.

---

## 5. PERFORMANS OPTİMİZASYONU

**Backend**
- `BatchGetItem` (max 100 anahtar) — `matchFace.ts` N+1'ini tek çağrıya indirir.
- Admin aggregation: scan yerine DynamoDB Streams + `system-stats` tablosuna atomic counter.
- Pagination loop (`LastEvaluatedKey`) `scanTable` / `queryItems` util'ine eklensin; kullanıcı sayısı arttığında veri kaybı engellenir.
- `Rekognition.detectFaces({ Attributes: ['ALL'] })` yerine sadece gerekli nitelikler; bandwidth tasarrufu.
- `esbuild` + `serverless-esbuild minify: true`, tree-shake `@aws-sdk` alt modüllerine; cold-start 1.5s → 400-600ms bekleniyor.
- `provisionedConcurrency` veya `SnapStart` (Node.js 20.x desteği için "Lambda Warmer") — matchFace / uploadPhoto için ilk istek latency'si.
- S3 signed URL: frontend'de presigned POST ile direkt upload, Lambda multipart parse yükünü eleyin.

**Frontend**
- `React.lazy(() => import('./pages/AdminDashboardPage'))` + `Suspense` — admin sayfaları landing page'de bundle'a girmesin.
- `vite.config.ts` `build.rollupOptions.output.manualChunks` ile `react`, `tanstack/query`, `stripe`, `i18next` ayrı chunk.
- `browser-image-compression` zaten var — PhotoUpload'da çoklu dosya için `Promise.allSettled` + concurrency limit (web worker'da).
- React Query invalidation: `onSuccess` içinde `queryClient.invalidateQueries(['events'])`.
- Büyük listeler (foto galerisi) için `react-window` / `react-virtual` virtualization.
- Image `loading="lazy"` + `srcset` + CloudFront boyut parametreleri.
- `sourcemap: false` prod build.

**Ağ & Altyapı**
- CloudFront cache behavior TTL + `Cache-Control` header'ları; signed URL tekrar üretiminin önüne geçin.
- API Gateway caching (stage seviyesinde) `getEvents`, `getEvent` gibi read-heavy endpoint'ler için.
- S3 Transfer Acceleration büyük fotoğraf yüklemelerinde opsiyonel.

---

## 6. EKSİK ÖZELLİKLER & GELİŞTİRME ÖNERİLERİ

**Güvenlik**
- AWS WAF + API Gateway usage plan (IP / user bazlı throttle).
- Refresh token + token revocation listesi (DynamoDB TTL).
- Parola zorluk politikası + breached-password kontrol (HaveIBeenPwned k-anonymity API).
- MFA (TOTP) özellikle admin hesapları için.
- Secret rotation runbook + AWS Secrets Manager entegrasyonu (env yerine).
- OWASP Top 10 smoke suite (CodeQL + npm audit CI'da).

**Gözlenebilirlik**
- Structured logging (pino / @aws-lambda-powertools/logger) + correlation ID (API Gateway request ID).
- CloudWatch custom metric'ler: upload latency, rekognition match latency, fail rate.
- CloudWatch Alarms + SNS → Slack.
- X-Ray trace'leri pasif değil aktif kullanılmalı (şu an enabled ama segment custom'ı yok).
- OpenTelemetry export (Datadog / Grafana Cloud).

**Ürün Özellikleri**
- Albümlere QR code sheet (PDF) indirme (şu an tek QR var).
- Konuk fotoğraf indirme favori listesi / wishlist.
- Fotoğrafçı brand customization: özel domain + logo + e-posta şablonu.
- Otomatik watermark (ödeme öncesi).
- Toplu zip indirme Lambda → S3 multipart (> 6 GB event'te Lambda timeout riski; Step Functions Map-state + ECS Fargate).
- Galeri paylaşımı için parola korumalı link.
- Event analytics: kaç konuk eşleşti, kaç foto indirdi, dönüşüm oranı.
- GDPR data subject access / silme self-service (şu an manuel gözüküyor).
- Bildirim: konuk eşleşme tamamlandığında e-posta/SMS.

**Ölçeklenebilirlik**
- Fotoğraf işleme için SQS kuyruğu + `processPhoto` consumer; S3 event'i yerine buffered pipeline.
- Rekognition koleksiyon split (per-event collection) — güvenlik sınırı + search latency.
- DynamoDB global tables ileride multi-region için.
- Çok kiracılık (tenant isolation) için `PK = TENANT#... SK = ...` single-table design düşünülebilir.

**Geliştirici Deneyimi**
- Commit öncesi `husky + lint-staged` + `eslint --fix` + `prettier`.
- `pnpm` ile monorepo (workspaces daha hızlı).
- Smoke / e2e test (Playwright) — kritik 3 flow: kayıt → event oluştur → konuk eşleşme.
- Storybook UI bileşenleri.
- Seed script + local DynamoDB (`serverless-dynamodb-local`).

---

## 7. FİNAL ÖZET

**En Kritik 10 Sorun (aciliyet sırasıyla)**

1. **Parola hashing SHA-256** — `bcrypt`/`argon2id`'e geçiş ve tüm aktif parolaların zorla sıfırlanması.
2. **`createOrder.ts` kırık JWT** — `verifyAuthHeader` util'ine geçiş; auth middleware genelleştirme.
3. **Committed secret'lar (`.env`, `.serverless/`)** — tüm anahtarları rotate et, `git filter-repo` ile geçmişi temizle.
4. **Hardcoded `JWT_SECRET` default** — boot-time fail-fast kontrolü + Secrets Manager'dan çekme.
5. **Terraform ↔ Serverless çift yönetim** — tek IaC kaynağı seç, diğerini `terraform import`/remove.
6. **IDOR (event/photo/face)** — her handler'da `ensureOwnership(userId, eventId)` + admin role testi.
7. **DynamoDB pagination eksik** — util'e `LastEvaluatedKey` döngüsü ekle; admin raporları yeniden testle.
8. **`localStorage` JWT (+ FE-only admin koruma)** — httpOnly cookie + SameSite=Lax, admin route'ları backend'de koru.
9. **CORS wildcard + Rekognition IAM `*`** — explicit origin listesi + koleksiyon ARN'ı.
10. **Test coverage ~%0** — core flow'lar için Jest (backend) + Vitest + Playwright (frontend) suite başlat.

**Öncelikli Düzeltmeler (2 Hafta Sprint'i)**
- Sprint 1 (1. hafta): Auth/crypto hardening (1, 2, 4), secret rotation (3), IDOR fix (6).
- Sprint 2 (2. hafta): IaC birleştirme (5), pagination (7), CORS/IAM daraltma (9), CI/CD deploy job (H9).
- Backlog: localStorage → cookie, Payment Element, observability, test coverage, refactor service katmanı.

**En Yüksek Etki Yaratacak Geliştirmeler**
- Tek seferlik: `bcrypt` + JWT middleware + IaC konsolidasyonu → güvenlik + operasyonel risk dramatik düşer.
- Orta vadede: service/repository katmanı + zod şema zorunluluğu → regression oranı düşer.
- Uzun vadede: event-driven foto pipeline (SQS + Step Functions) + observability → ölçeklenme ve SLA garantisi.

---

### Kontrol Edilen Dosya Sayısı
- Backend: 36 handler + 11 utility + `serverless.yml` + tests
- Frontend: 35+ page/component + contexts + api client + config
- IaC: 4 Terraform dosyası + 1 CI workflow
- Dokümantasyon: 15+ Markdown dosyası

### Toplam Bulgu
- **Critical:** 7
- **High:** 14
- **Medium:** 14
- **Low:** 6
- **Toplam:** 41 aksiyon alınabilir bulgu
