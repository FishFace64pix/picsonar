# EventFaceMatch / PicSonar — Production Readiness Roadmap

**Oluşturulma:** 17 Nisan 2026
**Hedef Launch:** T + 12 hafta (≈ 10 Temmuz 2026)
**Durum:** Pre-launch (canlı müşteri yok → breaking change serbest)
**Kapsam:** Tam production-ready refactor (41 bulgu → 0)

> Bu doküman AUDIT_REPORT_2026-04-17.md'deki bulguların uygulama planıdır. Her fazın **exit criteria**'sı vardır; bir faz bitmeden sonraki başlamaz. Otonom / onay gerektiren / runbook işleri açıkça ayrıştırılmıştır.

---

## ÖZET TABLOSU

| Faz | Süre | Tema | Exit Criteria | Bloker mi? |
|-----|------|------|---------------|------------|
| 0 | 1 gün | Temizlik + roadmap | Repo artifact-free, task listesi onaylı | Evet |
| 1 | 2 hafta | Güvenlik kritik | 7 Critical + 6 High bulgu kapalı, secret'lar rotate | Evet |
| 2 | 2 hafta | Kod kalitesi + shared paket | DRY, tip güvenliği, zod her handler'da | Evet |
| 3 | 2 hafta | Veri katmanı + performans | Pagination, BatchGet, atomic credits, indeksler | Evet |
| 4 | 2 hafta | Frontend sertleştirme + UX | Toast, lazy routes, a11y, empty/loading states | Hayır |
| 5 | 2 hafta | Observability + test + CI/CD | Coverage ≥ %60, deploy job, alarm'lar | Evet |
| 6 | 1 hafta | IaC konsolidasyon + yük testi | Tek SSOT, k6 yük testi pass, DR drill | Evet |
| Go-Live | 1 hafta | Soft launch + gözlem | Staging 7 gün stabil, playbook hazır | — |

---

## FAZ 0 — TEMİZLİK & ZEMİN (Gün 1-3)

**Hedef:** Repoyu ve geliştirici deneyimini temizle; sonraki fazlar için zemin hazırla.

### 0.1 Repository Hygiene (Otonom)
- Kök: `tmp_check.js`, `tmp_fix.js` sil.
- `backend/`: `.serverless/`, `deploy_output*.txt`, `deployLogs.txt`, `logs.txt`, `awslogs.txt`, `awspay*.json`, `aws_events.json`, `payload.json`, `response.json`, `out.json`, `update-{key,names,values}.json`, `test-results.json`, `cors.json` (taşınacak: `infra/s3-cors.json`) sil/taşı.
- `frontend/`: `tsc_output.txt`, `tsc_output2.txt` sil; `dist/` gitignore'a eklendiğinden emin ol.
- `.gitignore` sıkılaştır (`*.log`, `*.tmp`, `deploy_output*`, `.serverless/`, `*.tfstate*`, `.env*`, `!.env.example`).
- Markdown dosyalarını konsolide et: `docs/` klasörü yarat, kanonik `README.md` + `docs/{setup,deployment,architecture,runbooks}/` yapısı. Türkçe + İngilizce ayrı klasörler.

### 0.2 Developer Experience (Otonom)
- `package.json` workspace → `pnpm-workspace.yaml` (opsiyonel ama tavsiye edilir). Aksi halde npm workspaces kalsın.
- Kök'e `husky` + `lint-staged` + `prettier` + `eslint` + `commitlint` ekle.
- `tsconfig.base.json` kök'e; `frontend` ve `backend` bunu extend etsin.
- `.editorconfig`, `.nvmrc` (20.x), `.node-version`.

### 0.3 Karar Dokümanı (Onay Gerekli)
- `IAC_DECISION.md` yaz: Terraform vs Serverless bölüşümü önerisi. **Kullanıcı onayından sonra** Faz 6'da uygulanacak.

**Exit Criteria**
- `git clean -ndX` çıktısı boş.
- `npm run lint` ve `npm run typecheck` 0 uyarı.
- `docs/` altında tek kanonik kaynak.

---

## FAZ 1 — GÜVENLİK KRİTİK (Hafta 1-2)

**Hedef:** Hiçbir CRITICAL + en kritik HIGH bulgu açık bırakmadan güvenlik temelini kur.

### 1.1 Auth & Şifre (C1, C2, C4) — Otonom
- `backend/src/utils/password.ts` yeni util: `bcryptjs` cost 12; `hash(password)`, `verify(hash, password)`.
- `register.ts`, `login.ts`, `resetPassword.ts` SHA-256 blokları kaldır → `password.hash/verify`.
- `backend/src/utils/jwt.ts`: env `JWT_SECRET` eksikse boot-time `throw new Error('JWT_SECRET is required')`. Default string kaldır.
- `backend/src/middleware/auth.ts`:
  - `verifyAuthHeader(event) → { userId, role }` — JWT doğrulama.
  - `requireAdmin(event) → void` — admin değilse 403.
- `createOrder.ts` kırık `token.split(':')` fix → `verifyAuthHeader(event)`.
- Tüm admin handler'larındaki copy-paste auth bloğunu `requireAdmin()` ile değiştir.
- **Migration (launch öncesi OK):** User tablosunda `passwordHash` kolonunu bcrypt ile yeniden seed eden script. Canlı müşteri olmadığından hard-reset.

### 1.2 IDOR Kapama (H1) — Otonom
- `backend/src/middleware/ownership.ts`: `ensureEventOwnership(eventId, jwt)` — admin değilse userId eşleşmeli.
- `getEvent.ts`, `getEventPhotos.ts`, `getEventFaces.ts`, `deletePhotos.ts`, `processPhoto.ts`, `createOrder.ts` → ownership check ekle.
- `deletePhoto.ts`: `photo.eventId === eventId` + `event.userId === userId` çift kontrol.

### 1.3 File Upload Validation (H4) — Otonom
- `backend/src/utils/fileValidation.ts`: magic-byte ile MIME tespiti (file-type paketi), max 15 MB foto / 5 MB face, izinli: `image/jpeg`, `image/png`, `image/webp`.
- `uploadPhoto.ts`, `matchFace.ts` → önce validate, sonra işle.
- Frontend `PhotoUpload.tsx` aynı kuralı UX seviyesinde uygula (erken reddet).

### 1.4 Secret Hygiene (C3) — Runbook + Kısmi Kod
- Kod: `.env` git'ten çıkar; `.env.example` oluştur (sadece key'ler, boş value).
- `backend/src/config/env.ts`: zod ile env validation (fail-fast). Gerekli env'ler: `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `BREVO_SMTP_USER`, `BREVO_SMTP_PASS`, `REKOGNITION_COLLECTION_ID`.
- Runbook: `docs/runbooks/SECRET_ROTATION.md`.
- Runbook: `docs/runbooks/GIT_HISTORY_CLEANUP.md` (git filter-repo adımları).

### 1.5 Netopia Webhook (C5) — Otonom + Onay
- `payment/netopiaWebhook.ts`: Gerçek RSA-RC4 decryption uygula (Netopia v2 protokolü). Public key + private key yönetimi AWS Secrets Manager.
- **Karar:** Netopia canlıya açılacak mı? Eğer v1'de sadece Stripe yeterliyse, Netopia'yı feature-flag arkasına al ve Faz 4'e ertele. **Kullanıcı onayı gerekli.**

### 1.6 CORS + IAM Daraltma (H2, H3) — Otonom
- `backend/cors.json` → explicit origin: `https://picsonar.com`, `https://www.picsonar.com`, `https://app.picsonar.com`, `http://localhost:5173` (dev).
- `serverless.yml` Rekognition IAM → `arn:aws:rekognition:${aws:region}:${aws:accountId}:collection/eventfacematch-collection-${sls:stage}`.
- S3 IAM wildcard yerine bucket-specific ARN listesi.

### 1.7 Rate Limiting (H5) — Otonom
- `backend/src/middleware/rateLimit.ts`: DynamoDB `rate-limits-${stage}` tablosu, `pk = ip#endpoint`, TTL 60s, atomic `UpdateItem ADD #count :one`.
- `matchFace`, `forgotPassword`, `login`, `register` endpoint'lerinde kullan.
- Uzun vadede: AWS WAF + API Gateway usage plan (Faz 6).

### 1.8 Repo Secret Rotation (Runbook — Kullanıcı)
- Rotate: Stripe sk, Brevo SMTP pass, JWT secret, AWS IAM kullanıcı key'i.
- Runbook talimat listesi ile teslim edilir.

**Exit Criteria**
- `npm test` içinde auth/password testleri yeşil.
- OWASP ZAP baseline scan clean.
- Git history'de `.env` yok (user runbook'u koştu mu check).
- Secret'lar AWS Secrets Manager'da (user uygular).

---

## FAZ 2 — KOD KALİTESİ & PAYLAŞILAN PAKET (Hafta 3-4)

**Hedef:** DRY, tip güvenli, service katmanlı, zod zorunlu bir kod tabanı.

### 2.1 Monorepo Workspace Yapısı (Otonom)
```
/packages/shared
  /src
    /schemas          # zod şemaları (event, user, order, photo)
    /constants        # packages (SKU/fiyat), rekognition config
    /types            # TypeScript interface
    /validators       # validateCUI, email, phone
  package.json        # "name": "@picsonar/shared"
  tsconfig.json
```
- `validateCUI`, `packages.ts`, event/user/order/photo tipleri buraya taşı.
- `backend` ve `frontend` bu paketi import eder: `import { EventSchema } from '@picsonar/shared/schemas'`.

### 2.2 Backend Service / Repository Katmanı (Otonom)
```
/backend/src
  /handlers           # ince controller'lar (event + validation + response)
  /services
    authService.ts
    eventService.ts
    creditsService.ts
    paymentService.ts
    faceService.ts
    emailService.ts
  /repositories
    eventRepository.ts
    userRepository.ts
    photoRepository.ts
    faceRepository.ts
    orderRepository.ts
  /domain             # entity + zod
  /infra
    dynamo.ts
    s3.ts
    rekognition.ts
    stripe.ts
    email.ts
```
- Her handler: auth → zod parse → service çağrısı → response. 30 satırdan kısa hedef.

### 2.3 Input Validation Middleware (Otonom)
- `backend/src/middleware/validate.ts`: `withValidation(schema)(handler)` higher-order.
- Tüm handler'lar `withAuth + withValidation + handler` sarmalı ile çalışır.
- `zod` zaten dep; tutarlı kullanım.

### 2.4 Error Handling Standardı (Otonom)
- `backend/src/utils/errors.ts`: `AppError`, `AuthError`, `NotFoundError`, `ValidationError`, `ConflictError`.
- `withErrorHandler` middleware → structured JSON response (`{ error: { code, message, traceId } }`).
- Silent swallow kaldır; logger.error + correlation ID.

### 2.5 Frontend Feature Folders (Otonom)
```
/frontend/src
  /features
    /auth             (login, register, reset, forgot, AuthContext)
    /events           (dashboard, event page, create event)
    /admin            (all admin pages)
    /checkout         (checkout, pricing, orders)
    /guest            (guest scan flow)
  /lib
    apiClient.ts
    auth.ts
    i18n.ts
  /ui                 (primitives — shadcn/ui veya Radix tabanlı)
  /hooks
  /providers
```

### 2.6 Duplicate Code Temizliği (Otonom)
- `frontend/src/utils/validateCUI.ts` → `@picsonar/shared` import.
- `frontend/src/constants/packages.ts` → `@picsonar/shared` import.
- `@ts-ignore` kullanımlarını sıfırla; gerçek tipler ekle.

**Exit Criteria**
- `pnpm -r typecheck` 0 hata, `--strict` açık.
- `validateCUI` tek yerde (grep 1 match).
- Handler max 50 satır (lint kuralı).

---

## FAZ 3 — VERİ KATMANI & PERFORMANS (Hafta 5-6)

### 3.1 DynamoDB Util Sertleştirme (Otonom)
- `scanTable`, `queryItems` → AsyncGenerator + `LastEvaluatedKey` loop.
- `batchGetItems(keys, table)` — max 100 anahtar, otomatik chunk.
- `transactWrite` util'i — credit deduction + event create tek TX'te.
- Tüm admin scan'lerinde aggregation tablosuna geç: `system-stats` tablosu DynamoDB Streams + Lambda ile gerçek-zamanlı counter.

### 3.2 Atomic Credits (H7) — Otonom
- `createEvent` credit düşümü:
```ts
await update({
  Key: { userId },
  UpdateExpression: 'SET eventCredits = eventCredits - :one',
  ConditionExpression: 'eventCredits >= :one',
  ExpressionAttributeValues: { ':one': 1 }
})
```
- `uploadPhoto` benzer şekilde; face credit için de aynı.

### 3.3 Schema Değişiklikleri (Onay Gerekli)
- Tablo başına sort key + `createdAt` GSI önerisi → `docs/DB_MIGRATION.md` yaz.
- Pre-launch olduğundan drop/recreate serbest. Yine de onay iste.

### 3.4 N+1 Fix (M4) — Otonom
- `matchFace.ts`: photoId dizisi → `batchGetItems`.
- `getEventPhotos`: signed URL batch generate + CloudFront ile cache.

### 3.5 Float Precision (M1) — Otonom
- Para birimi bani/cent cinsinden integer sakla. `Math.round` yerine `Number(totalBani)`.
- Paket fiyatları `@picsonar/shared` içinde cent olarak tanımla.

### 3.6 S3 / CloudFront Optimizasyon (Otonom)
- Signed URL 5 dk yerine standart 1 saat + cache.
- Frontend'e doğrudan presigned POST: upload yolu Lambda multipart parse'ı tamamen kaldır.
- CloudFront `cache_policy_id` (deprecated `forwarded_values` kaldır).

**Exit Criteria**
- k6 yük testi: 100 RPS, p95 < 500ms (matchFace), p95 < 300ms (getEventPhotos).
- DynamoDB throttle 0.

---

## FAZ 4 — FRONTEND SERTLEŞTİRME & UX (Hafta 7-8)

### 4.1 Auth Flow (H12) — Otonom
- Backend: `auth/login` Set-Cookie httpOnly, SameSite=Lax, Secure, /. Response body'den token kaldır.
- Frontend: `AuthContext` `localStorage` yerine sunucudan `GET /auth/me` ile user state. `credentials: 'include'` axios.
- Token refresh: `/auth/refresh` endpoint'i (30 gün refresh TTL).

### 4.2 Admin Route Backend Enforcement (H13) — Otonom
- Tüm `/admin/*` handler'larda `requireAdmin`. Frontend `AdminLayout` yalnızca UX için (404 redirect).

### 4.3 UI Kit Migration (Otonom)
- `shadcn/ui` ile primitives: Dialog, Toast, Dropdown, Command, Sheet.
- `react-hot-toast` veya Sonner.
- Tüm `alert()` / `confirm()` kullanımları toast + Dialog'a.
- Modal ESC + focus trap.

### 4.4 Lazy Routes + Bundle (Otonom)
- `React.lazy` + `Suspense` — admin sayfaları, GDPR sayfaları, DPA.
- `vite.config.ts` manualChunks: react, router, stripe, query, i18n.
- `sourcemap` sadece dev.

### 4.5 Form Yönetimi (Otonom)
- `react-hook-form` + `@hookform/resolvers` + `@picsonar/shared` zod şemaları.
- Inline field validation, submit state, loading.

### 4.6 Loading / Empty / Error States (Otonom)
- `<Skeleton>` bileşeni; tüm liste/kart alanlarına.
- Empty state illüstrasyonu + CTA.
- Error state retry button'ı + toast.

### 4.7 Accessibility (M9, M10) — Otonom
- Tüm input'ta `htmlFor`/`id`.
- SVG icon'lara `aria-label` veya `aria-hidden`.
- Kontrast WCAG AA.
- Keyboard navigation + focus visible.

### 4.8 i18n (M8) — Otonom
- `supportedLngs: ['en', 'ro', 'tr']` (TR eklensin ya da TR tamamen çıkartılsın — onay iste).
- Eksik key detect scripti CI'da.

**Exit Criteria**
- Lighthouse: Performance ≥ 85, Accessibility ≥ 95, Best Practices ≥ 95.
- Bundle initial JS < 250 KB gzipped.
- Axe-core a11y scan 0 critical.

---

## FAZ 5 — OBSERVABILITY + TEST + CI/CD (Hafta 9-10)

### 5.1 Structured Logging (Otonom)
- `@aws-lambda-powertools/{logger,tracer,metrics}`.
- Her handler başında `logger.appendKeys({ requestId, userId })`.
- Stripe / Netopia webhook'larda sensitive field masking (`cardNumber`, `cvv`).

### 5.2 CloudWatch Alarms (Otonom)
- Lambda error rate > %1 (5 dk).
- DynamoDB throttle > 0.
- Rekognition 5xx > 0.
- Payment failure count > 5 / saat.
- SNS → Slack webhook.

### 5.3 Test Suite (Otonom)
**Backend (Jest):**
- `password.test.ts`: hash/verify round-trip, cost.
- `jwt.test.ts`: sign/verify, expiry.
- `auth/register.test.ts`, `login.test.ts`: happy + sad paths.
- `createOrder.test.ts`: IDOR kontrol.
- `matchFace.test.ts`: olan testi genişlet (rate limit, file validation).
- `stripeWebhook.test.ts`: signature verify, idempotency.
- `createEvent.test.ts`: credit race (TransactWrite).
- Mock: aws-sdk-client-mock.

**Frontend (Vitest + Testing Library):**
- `LoginPage.test.tsx`, `RegisterPage.test.tsx`.
- `CheckoutPage.test.tsx` (Stripe mock).
- `AuthContext.test.tsx`.
- `validateCUI.test.ts` (paylaşılan paketten).

**E2E (Playwright):**
- `critical-flow.spec.ts`: register → verify email → create event → upload photo → guest scan → match.
- `admin-flow.spec.ts`: admin login → users → disable user.
- `payment-flow.spec.ts`: Stripe test card → credit çoğalır.

**Coverage Hedef:** backend ≥ %70, frontend ≥ %50, e2e 3 critical flow.

### 5.4 CI/CD (Otonom)
`.github/workflows/`:
- `ci.yml`: push her branch → lint + typecheck + test + build.
- `deploy-staging.yml`: `main` merge → staging stack + e2e smoke.
- `deploy-prod.yml`: tag `v*` → prod stack, manuel approval gate.
- `rollback.yml`: workflow_dispatch ile önceki tag'e revert.

**Secret Yönetimi:**
- GitHub OIDC → AWS IAM role (temporary credentials).
- AWS Secrets Manager'dan env inject (build-time değil, Lambda runtime).

### 5.5 Feature Flags (Otonom)
- Basit: DynamoDB `feature-flags` tablosu + 5 dk cache.
- Flag örnekleri: `netopia_enabled`, `new_dashboard_ui`, `rate_limit_strict`.

**Exit Criteria**
- CI pipeline 10 dk altında tamamlanıyor.
- Coverage hedefleri tutturuldu.
- Staging'de 72 saat çalışan, 0 kritik alarm tetiklenmemiş.

---

## FAZ 6 — IaC KONSOLİDASYON + YÜK TESTİ (Hafta 11)

### 6.1 IaC Tek Kaynak (Onay Sonrası)
- `IAC_DECISION.md` onaylandıktan sonra uygula.
- Önerilen bölüşüm:
  - **Terraform:** VPC, IAM role'ler, S3 bucketlar, CloudFront, Route53, ACM, SES domain, Secrets Manager.
  - **Serverless Framework:** Lambda fonksiyonları, API Gateway, DynamoDB tabloları (app-specific).
- Çakışan kaynakları `terraform import` veya `serverless remove` ile tekleştir.
- `main.tf` `aws_region` default → `eu-central-1`.
- CloudFront `cache_policy_id` migration.
- S3 bucket isim standardizasyonu (`-x92k` suffix ya kaldır ya da Terraform'a da ekle).

### 6.2 DR & Backup (Otonom)
- DynamoDB point-in-time recovery açık.
- S3 cross-region replication (opsiyonel; runbook'a eklenir).
- Secrets Manager rotasyon (90 gün JWT, 180 gün SMTP).
- Runbook: `docs/runbooks/DISASTER_RECOVERY.md`.

### 6.3 Load Testing (Otonom)
- k6 script: peak 500 RPS matchFace, 100 RPS upload, 200 RPS getEvents.
- 30 dk soak test.
- Rekognition quota validation (`IndexFaces` 50 RPS default).

### 6.4 GDPR Kompliyans Denetimi (Otonom)
- Data subject access endpoint (`/gdpr/export`).
- Right to deletion (`/gdpr/delete`).
- `PicSonar_GDPR_Legal_Documents.md` → runtime policy sayfaları ile eşitle.

**Exit Criteria**
- `terraform plan` ve `serverless deploy --dry-run` 0 çakışma.
- k6 yük testi p95 SLA'ları yeşil.
- DR drill: staging'de full-restore < 30 dk.

---

## GO-LIVE — SOFT LAUNCH + GÖZLEM (Hafta 12)

### G.1 Pre-Launch Checklist
- [ ] Tüm secret'lar Secrets Manager'da.
- [ ] Staging 7 gün 0 kritik alarm.
- [ ] Playbook'lar yazılı (`docs/runbooks/`).
- [ ] On-call rotasyonu belirlendi.
- [ ] Status page kuruldu (statuspage.io veya self-hosted).
- [ ] Backup test edildi (DR drill geçti).
- [ ] Stripe live key geçişi runbook'ta.

### G.2 Launch
- DNS cutover.
- Feature flag ile kademeli rollout: %10 → %50 → %100 (1 hafta).
- 24/7 monitoring ilk 72 saat.

### G.3 Post-Launch (Hafta 13+)
- Backlog: Medium + Low bulgular.
- Kullanıcı geri bildirimi → backlog'a ekle.
- Retrospektif + performans incelemesi.

---

## OWNER / RİSK MATRİSİ

| Alan | Primary | Backup | Risk | Mitigation |
|------|---------|--------|------|------------|
| Backend refactor | Claude (otonom) | Kullanıcı review | Breaking change | Pre-launch; her PR'de test |
| Frontend refactor | Claude (otonom) | Kullanıcı review | UX regression | Visual regression + Playwright |
| IaC konsolidasyon | Claude (onay sonrası) | Kullanıcı uygular | State drift | Önce staging; plan+apply ayrı |
| Secret rotation | Kullanıcı (runbook) | — | Downtime | Off-hours; kademeli rotate |
| Git history cleanup | Kullanıcı (runbook) | — | Fork'lar bozulur | Takım haberli; force-push uyarı |
| Payment (Netopia) | Kullanıcı onayı gerekli | Claude uygular | Canlı ödeme kaybı | Feature flag; kademeli |
| Deploy | GitHub Actions | Manuel fallback | Rollback ihtiyacı | rollback.yml workflow |

---

## ROLLBACK PLANI

**Her deploy için:**
- Lambda version alias: `live` → önceki version'a switch (30 sn).
- DynamoDB on-demand → point-in-time restore (son 35 gün).
- S3 versioning aktif; dosya delete marker ile geri alınır.
- CloudFront invalidation.
- DNS TTL 60 sn (launch öncesi).

**Büyük incident:**
- Tag `v-rollback-<timestamp>` ile workflow_dispatch.
- Slack announce, status page update.
- RCA 48 saat içinde `docs/incidents/<date>.md`.

---

## SUCCESS KPI

| KPI | Baseline | Target |
|-----|----------|--------|
| API p95 latency | bilinmiyor | < 500 ms |
| Error rate | bilinmiyor | < %0.5 |
| Test coverage | < %5 | ≥ %60 |
| CI pipeline süresi | yok | < 10 dk |
| Lighthouse Performance | bilinmiyor | ≥ 85 |
| Lighthouse A11y | bilinmiyor | ≥ 95 |
| Critical/High bulgu | 21 | 0 |
| Bundle initial JS | bilinmiyor | < 250 KB gz |
| Cold start p50 | ~1.5 s tahmin | < 600 ms |
| MTTR (incident) | — | < 30 dk |

---

## KARAR GEREKTİREN NOKTALAR (Kullanıcıdan)

1. **Netopia**: Launch'a dahil mi? Yoksa Faz 4'e ertelensin mi?
2. **IaC SSOT**: Terraform + Serverless bölüşümü onayı (IAC_DECISION.md sonra yazılacak).
3. **DB schema değişikliği**: Sort key + createdAt GSI drop/recreate onayı.
4. **Türkçe dil desteği**: i18n'e eklensin mi yoksa kaldırılsın mı?
5. **pnpm**: npm workspaces → pnpm geçiş onayı.
6. **Secret rotation zamanı**: Ne zaman rotate edilsin (operational window)?

---

## AKSİYON SIRASI (Bu Session'da Başlanacak)

Kullanıcı onay bekleyenler hariç, şu sırayla otonom ilerliyorum:

1. ✅ Roadmap (bu doküman)
2. 🔄 Repo hijyen + .gitignore + dosya silme
3. 🔄 Shared paket (`packages/shared`)
4. 🔄 Auth hardening (bcrypt, JWT middleware, createOrder fix)
5. 🔄 IDOR middleware + ownership fix
6. 🔄 File upload validation + env zod schema
7. 🔄 DynamoDB pagination + atomic credits + BatchGet
8. 🔄 Rate limiting (DynamoDB-backed)
9. 🔄 CORS + IAM daraltma
10. 🔄 Frontend ErrorBoundary + lazy + toast
11. 🔄 Observability (powertools)
12. 🔄 Test iskeleti
13. 🔄 CI/CD deploy workflow
14. 🔄 Runbook'lar
15. ⏸️ IaC konsolidasyonu (onay bekliyor)

Her adımın sonunda `AUDIT_PROGRESS.md` güncellenir. Session kapanırsa kalınan yerden devam edilir.
