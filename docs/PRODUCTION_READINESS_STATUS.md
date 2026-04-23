# Production Readiness Status

Snapshot of what's in the codebase vs. what still needs your hand before
you can safely flip prod live.

Last updated: 2026-04-19 (after the second audit cycle — see §"Audit fixes
(2026-04-19)" below; deferred nice-to-haves live in `docs/SAAS_BACKLOG.md`).

---

## ✅ Done in code (no further action from you)

### Security foundations
- bcrypt password hashing (cost 12), legacy SHA-256 migration via password reset.
- JWT access + refresh with HS256, issuer + audience claims, 15-min access / 30-day refresh.
- **Refresh tokens carry a unique `jti`; server-side revocation blocklist** (`RevokedTokensTable`, sha256(jti) keys, DynamoDB TTL auto-scavenge). Logout, password-change, and one-use rotation all burn the old jti.
- **Account lockout:** 5 failed password attempts → 15-minute lock, cleared on first successful login. Layered on top of the existing per-IP rate limiter.
- **Email verification:** 24-hour sha256-hashed tokens issued at registration; paid flows (`createPaymentIntent`) gated on `emailVerified === true`; resend endpoint rate-limited 3/10min.
- All mutating endpoints behind `requireAuth`; IDOR closed via `ensureEventOwnership`.
- zod validation on every handler; shared schemas between FE + BE via `@picsonar/shared`.
- DynamoDB-backed sliding-window rate limiter.
- CORS allowlist driven by `ALLOWED_ORIGINS` env.
- Security headers (CSP, HSTS 2y + preload, X-Frame-Options DENY, Permissions-Policy, COOP/CORP) on every API response.
- Meta-CSP in `frontend/index.html` + runbook for CloudFront Response Headers Policy.
- Magic-byte file validation (not just MIME trust).
- Atomic credit decrement + photo-slot reservation with refund-on-failure.
- **Responsible-disclosure policy:** `SECURITY.md` + RFC 9116 `/.well-known/security.txt` at both apex domains.

### Data durability
- **PITR enabled on every DynamoDB table**.
- **SSE enabled on every DynamoDB table**.
- S3 buckets: PublicAccessBlock on all, lifecycle rule to expire after 180 days for photos/faces.
- Orders: now tracks `invoiceNumber`, `invoicePdfLink`, `invoiceProvider`, `eInvoiceSubmitted`, `invoiceError`.

### Observability
- Structured JSON logs via `logger.child({traceId, endpoint})`.
- CloudWatch EMF custom metrics: `RequestLatency`, `RequestCount`, `UnhandledError`, `CreditApplyFailed`, `InvoiceFailed`, `InvoiceAnafSubmitFailed`, `OblioFailure`, etc.
- **CloudWatch log retention**: 14 days (dev), 30 days (staging), 90 days (prod).
- **CloudWatch alarms**: API 5xx, API p99 latency, DLQ depth, DynamoDB throttles, Lambda errors — all route to an SNS topic `picsonar-alarms-{stage}`.
- Correlation ID propagation (`traceId` in every log line + error response).

### Frontend hardening
- Access token in-memory only (no localStorage); refresh-on-401 axios interceptor.
- Route-based code splitting with `React.lazy` + Suspense fallback.
- ErrorBoundary with production stack-hiding + `onError` hook for Sentry wiring.
- Toast notifications (react-hot-toast) mounted at root.

### Payments — Romania-ready
- **Stripe is now the sole payment rail.** Netopia + Oblio integration code, env, serverless functions and dashboard UI were removed in the 2026-04-19 audit cycle. The accountant exports the monthly Stripe payout report and submits e-Factura into SPV manually — see `docs/runbooks/accountant-monthly-closing.md`.
- `createPaymentIntent`: Stripe **automatic_tax** enabled, Customer + `tax_id` `ro_cui` attached, **card-only** (`payment_method_types: ['card']` — Apple Pay / Google Pay / Link / SEPA intentionally off per product decision), `statement_descriptor_suffix: 'PICSONAR'`. Callers must have `emailVerified === true`.
- `verifyPayment`: rejects any non-`pi_`-prefixed order ids (legacy Netopia shape is unreachable).
- `stripeWebhook`: idempotent via `existing.status` guard; handles `payment_intent.succeeded`, `payment_intent.payment_failed` (alert email), `charge.refunded`, `charge.dispute.created`; emits `CreditApplyFailed` metric; logs with traceId.
- **Stripe Customer Portal**: `POST /billing/portal-session` lazy-creates a Stripe Customer (persists `stripeCustomerId` on first visit) and returns a portal URL — self-service invoice downloads, tax id updates, payment method changes.

### Consumer rights + legal
- **Immediate-delivery consent checkbox** on `/register` (OUG 34/2014 14-day waiver).
- Backend rejects registration without `immediateDeliveryConsent: true`.
- `acceptedImmediateDeliveryAt` timestamp + IP + UA persisted as audit trail.
- Footer: **ANPC link** + **SOL/ODR link** (required by RO e-commerce law) + legal entity + CUI + ONRC.
- **GDPR Art. 17 (right to erasure):** `POST /auth/delete-account` with password re-auth → soft-delete with 30-day grace (`purgeAt` epoch), revokes all active refresh tokens, rate-limited 3/hour.
- **GDPR Art. 20 (right to portability):** `GET /auth/export-data` returns every row the user owns as JSON (password/tokens stripped), rate-limited 1/24h, `Content-Disposition: attachment`.
- **Cookie consent banner** (Legea 506/2004): first-party `picsonar_cookie_consent` cookie, 365-day TTL, i18n RO/EN/TR, linked to `/privacy`.
- **SEO & crawler controls:** `public/robots.txt` disallows every authenticated surface; `public/sitemap.xml` lists only the 10 public SEO routes.

### CI/CD
- `.github/workflows/ci.yml` — typecheck, lint, test, build, summary gate.
- `.github/workflows/deploy.yml` — OIDC role assumption, per-stage reviewer approval, backend → frontend → smoke pipeline, **Rekognition collection bootstrap step**.
- `.github/workflows/codeql.yml` — weekly static analysis.
- `.github/dependabot.yml` — grouped weekly bumps.

### Runbooks
- `docs/runbooks/secret-rotation.md` — JWT, Stripe, Netopia, SMTP, OIDC trust, IAM audit.
- `docs/runbooks/git-history-cleanup.md` — leaked-secret rewrite with prevention setup.
- `docs/runbooks/edge-headers.md` — CloudFront Response Headers Policy config.
- `docs/runbooks/README.md` — index.
- `docs/iac-consolidation-proposal.md` — **awaits your A/B/C/D/S decision**.

### Tests
- Backend Jest: env, password, JWT, errors, auth middleware, validate middleware.
- Frontend Vitest: tokenStore unit tests.
- Playwright skeleton: landing + login + register + 404 smoke.

---

## 🔴 Still requires YOU (launch blockers)

### 1. Stripe account activation
- Complete KYC in Stripe Dashboard for your SRL/PFA entity.
- Enable **Stripe Tax** in Dashboard → Tax → activate for Romania (19% standard).
- Register webhook endpoint: `https://<api-domain>/webhook/stripe` with event `payment_intent.succeeded`. Copy `whsec_...` to Secrets Manager.
- Leave Apple Pay, Google Pay, Link and SEPA **disabled** in Dashboard → Payment methods. We accept cards only; the code hard-locks this via `payment_method_types: ['card']` so Dashboard toggles can't silently re-enable wallets.

### 2. e-Factura — kaldırıldı, muhasebeci elle gönderiyor
- Oblio + Netopia entegrasyonu 2026-04-19 auditinde tamamen silindi (`serverless.yml`, `env.ts`, `.env.example`, fonksiyonlar, servisler).
- Her ay **Stripe Dashboard → Payouts → Export CSV** alın ve muhasebecinize iletin; muhasebeci e-Factura'yı SPV panelinden manuel olarak gönderir. (Runbook: `docs/runbooks/accountant-monthly-closing.md`.)
- Codul Fiscal art. 25 gereği fatura PDF'lerini 5 yıl saklamak zorunludur; `InvoicesBucket` üzerinde 5-yıl lifecycle kuralı zaten aktif.

### 3. AWS account bootstrap
- Create the **GitHub OIDC identity provider** in IAM (one-time per account).
- Create the **PicSonarDeployRole** with trust policy from `secret-rotation.md` §5.
- Put the role ARN in `AWS_DEPLOY_ROLE_ARN` repo secret.
- Create the **picsonar-alarms-prod** SNS subscription: email or PagerDuty endpoint.
- Create the **Secrets Manager entries**: `/picsonar/prod/{jwt,stripe,smtp}` with real values (rotation runbook walks you through it). *Netopia + Oblio entries are no longer needed.*

### 4. Domain / edge
- Register / transfer `picsonar.ro` (or current domain) to Route53.
- Request ACM cert in `us-east-1` (required for CloudFront) with CNAME validation.
- Create CloudFront distribution pointing to the frontend S3 bucket.
- Attach the Response Headers Policy per `edge-headers.md`.
- Put the distribution ID in `CLOUDFRONT_DISTRIBUTION_ID` repo secret.
- Put the bucket name in `FRONTEND_S3_BUCKET` repo secret.

### 5. SES production access
- Move SES out of sandbox via AWS support ticket. Provide your domain + use case.
- Verify the sending domain + DKIM + SPF.

### 6. Legal paperwork
- Finalize Privacy Policy + ToS + DPA + Consumer Rights pages in Romanian. Your `/privacy`, `/terms`, `/dpa`, `/consumer-rights` routes must render real content.
- Fill in the `<TODO>` placeholders in Footer.tsx with your real CUI (`ROXXXXXXX`) + ONRC (`JXX/XXXX/XXXX`).
- Get the Privacy Policy + ToS reviewed by a Romanian lawyer specializing in GDPR + OUG 34/2014.
- Register your processing with ANSPDCP if required (biometric processing > threshold).

### 7. IaC decision
- Review `docs/iac-consolidation-proposal.md` and pick **A / B / C / D / S**. Only then will the last set of stray click-ops resources be in code.

---

## 🟡 Recommended before wide-open traffic (not blocking soft-launch)

- **Frontend error reporting**: wire Sentry in `ErrorBoundary.onError` (needs DSN).
- **Real-user monitoring**: CloudWatch RUM or Sentry performance.
- **Integration tests**: backend handlers with `aws-sdk-client-mock` covering happy paths for auth, payment, and match flows.
- **Load test**: k6 or Artillery script for `uploadPhoto` + `matchFace` against staging.
- **Accessibility**: add axe-core to the Playwright suite; RegisterPage already has reasonable labels.
- **httpOnly refresh cookies**: move the refresh token out of memory and into a `Secure; HttpOnly; SameSite=Lax` cookie — eliminates the hard-refresh-logout UX and shrinks the XSS blast radius.
- **CloudFront Signed Cookies** for `/invoices/*` S3 links (time-limited access to PDFs).
- **Stripe fraud rules** tuning (Radar — high-risk → block, medium → 3DS).

---

## 🛠 Audit fixes (2026-04-19)

Second audit cycle, triggered by the "scan every file from scratch, make it
truly production-ready" review. Deferred nice-to-haves moved to
`docs/SAAS_BACKLOG.md`.

### Payments — single-rail cleanup
- Deleted every trace of Netopia: `functions/payment/{createNetopiaPayment,netopiaWebhook}.ts`, `env.ts` keys, `.env.example` section, `serverless.yml` handlers + env wiring, placeholder dashboard UI.
- Deleted every trace of Oblio: `services/invoicing/oblio.ts`, `OBLIO_*` env keys, `serverless.yml` IAM + env, feature flag.
- Rewrote `verifyPayment.ts` to reject any `orderId` that doesn't start with `pi_` and hard-code `paymentProvider: 'stripe'`.
- Added email-verification gate to `createPaymentIntent.ts` (blocks purchases from unverified accounts — closes the "bulk-register-with-burner-mails to farm trial credits" abuse path).
- Added `POST /billing/portal-session` with lazy Stripe Customer creation — users self-service invoice history, payment method updates, and tax-id edits.

### Auth hardening
- **Refresh-token revocation blocklist** (`backend/src/utils/tokenRevocation.ts` + `RevokedTokensTable`): every refresh token carries a `jti`; logout/rotation/password-change hash it with sha256 and stores it with a DynamoDB TTL matching the token's `exp`. `isRefreshTokenRevoked()` is checked on every refresh.
- `POST /auth/logout` — best-effort revoke, always 200 so clients can clear local state.
- `POST /auth/refresh` — one-use rotation; burns the incoming jti and mints a fresh pair. Rejects disabled accounts.
- **Account lockout** in `login.ts`: 5 failed attempts → 15-min lock (`lockoutUntil` epoch ms). Successful login clears `failedLoginAttempts`, `lockoutUntil`, `lastFailedLoginAt`. Also rejects `deleted` / `disabled` accounts.
- **Email verification flow:**
  - Registration generates a 32-byte hex token, stores sha256(token) with 24h expiry, queues a templated verification mail.
  - `POST /auth/verify-email` — bounded `scanTablePage(..., limit: 1)` by `emailVerifyTokenHash`, flips `emailVerified: true`, clears token fields.
  - `POST /auth/resend-verification` — rate-limited 3 emails / 10 min; returns a generic success message when the account is already verified (no user enumeration).

### GDPR endpoints
- `POST /auth/delete-account` — password re-auth, 30-day grace soft-delete (`deleted=true`, `disabled=true`, `purgeAt` epoch seconds), revokes refresh token if supplied, rate-limited 3/hour. Grace window respects Codul Fiscal art. 25's 5-year invoice retention by leaving invoice PDFs in S3 until scheduled purge.
- `GET /auth/export-data` — Art. 20 data portability; 1/24h per-user; strips `password`, `resetToken`, `emailVerifyTokenHash`, audit fields; `Content-Disposition: attachment; filename="picsonar-export-<userId>-<YYYYMMDD>.json"`.

### Frontend
- New `/verify-email` route (`VerifyEmailPage.tsx`) — auto-submits `?token=` on mount; loading / success / error states; offers resend for authenticated users.
- `AuthContext.logout` is now `async` and calls `POST /auth/logout` best-effort after clearing local state — UI flips to logged-out immediately even if the server is slow.
- Axios interceptor now calls `POST /auth/refresh` (not `/refresh-token`), picks up the rotated pair, and retries the original request once.
- New `CookieConsent.tsx` banner (Legea 506/2004) — first-party `picsonar_cookie_consent` cookie, 365-day TTL, `SameSite=Lax; Secure`, i18n labels.
- `public/robots.txt` rewritten to disallow every authenticated surface (`/dashboard`, `/event/`, `/guest/`, `/profile`, `/checkout`, `/admin/`, `/verify-email`, `/reset-password`) and reference both `.com` and `.ro` sitemaps.
- `public/sitemap.xml` created with the 10 public SEO routes + priorities + changefreq hints.
- Added `emailVerified` + `emailVerifiedAt` to the shared `User` type.

### Repo-wide
- `SECURITY.md` — responsible disclosure: 2-day ack, 5-day assessment, 90-day disclosure window, scope, safe-harbor.
- `public/.well-known/security.txt` (RFC 9116) — `security@picsonar.com`, 2027-12-31 expiry, preferred languages en/ro/tr.
- `LICENSE` — proprietary, all-rights-reserved.
- `docs/SAAS_BACKLOG.md` — deferred work: Sentry frontend+backend, helmet meta tags, i18n RO default, transactional email suite expansion (welcome / password-changed / event-complete / pre-expiry / refund), scheduled purge Lambda for soft-deleted accounts, GDPR audit log table, Stripe webhook replay runbook, CI shared-package-first build order, unverified-email banner + delete/export UI on `/profile`, DPIA, ANPC registry check, WebAuthn, per-user rate limit, admin IP allowlist.
- `backend/src/utils/jwt.test.ts` — added assertion that refresh tokens carry a unique `jti` and valid `exp`.

### Deferred intentionally (see `docs/SAAS_BACKLOG.md`)
- Sentry frontend + backend wiring (needs DSN).
- `react-helmet-async` per-page meta tags.
- i18n default flip from EN to RO + locale-aware `useLocaleFormat` hook.
- Expanded transactional email set (welcome, password-changed alert, event-processing-complete, pre-expiry warning, refund confirmation).
- Scheduled CloudWatch-triggered purge Lambda for `purgeAt <= now()` accounts (manual runbook available in the interim — the soft-delete flag already blocks login).
- Unverified-email dashboard banner + one-click `/profile` Delete-Account and Download-My-Data buttons. Endpoints are live; UI glue is the only missing piece.

---

## 🛠 Audit fixes (2026-04-18)

Final audit pass surfaced these — all closed in code:

- **JWT access TTL:** code said `'1h'`, doc said 15 min → reconciled to `'15m'` in `backend/src/utils/jwt.ts`. Front-end already refreshes silently on 401, so UX is unaffected.
- **`serverless.yml` insecure defaults removed** for `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SMTP_USER`, `SMTP_PASS`. Missing env at deploy-time now hard-fails instead of silently picking `'dev-secret-change-in-production!'`.
- **`backend/src/utils/email.ts`:** transporter is built lazily via `getEnv()`; missing SMTP creds are caught by the zod validator at cold start instead of producing silent send failures.
- **`backend/src/utils/invoice.ts`:** `INVOICES_BUCKET` reads via `getEnv()` and throws a readable error if unset (no more empty-string `Bucket: ''` to S3).
- **`backend/cors.json`:** S3 CORS origin wildcard `"*"` replaced with the explicit frontend allowlist.
- **`backend/serverless.yml` InvoicesBucket:** added a 5-year lifecycle (90d → GLACIER, expire ~5y) per Codul Fiscal art. 25 retention requirement.
- **`backend/functions/payment/netopiaWebhook.ts`:** added `NETOPIA_ENABLED` + `NETOPIA_PRIVATE_KEY` kill-switch. The mock-decryption path is now unreachable in any deployed stage. Real RC4/AES decryption + signature verification remain TODO if/when you ever turn Netopia on; until then Stripe is the only payment rail.
- **`frontend/src/pages/ConsumerRightsPage.tsx`:** new page (Romanian, OUG 34/2014 + art. 16 lit. m disclosure). Already linked from Footer's Legal column and from RegisterPage's consent checkbox.
- **`frontend/src/App.tsx`:** added `/consumer-rights` route + lazy import.

## 🚨 Things you must do before pushing prod

These are *separate* from the §1-§7 launch-blocker list above and were
discovered/triaged during the final audit:

1. **Rotate the Stripe test key + Brevo SMTP password** that are in your
   local `backend/.env`. They were never committed (verified via `git log
   --all --diff-filter=A`), but they have been visible in this assistant
   session and any local backup/sync. Generate fresh values and put them
   in Secrets Manager for prod, in a fresh local `.env` for dev.
2. **Fill the `<TODO>` placeholders in `frontend/src/components/Footer.tsx`**
   with your real CUI (e.g. `RO45123456`) and ONRC (e.g. `J40/1234/2024`).
   ANPC will fine you on a routine sweep if these say `RO<TODO>` in
   production.
3. **Commit the audit-fix changes** if you agree with them — `git status`
   will show modified `serverless.yml`, `email.ts`, `invoice.ts`,
   `jwt.ts`, `cors.json`, `netopiaWebhook.ts`, and the new
   `ConsumerRightsPage.tsx`.

---

## Quick-reference env vars needed in prod

```
JWT_SECRET=<64-char base64>
JWT_REFRESH_SECRET=<64-char base64, different from JWT_SECRET>

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# DynamoDB tables
USERS_TABLE=eventfacematch-users-prod
EVENTS_TABLE=eventfacematch-events-prod
PHOTOS_TABLE=eventfacematch-photos-prod
ORDERS_TABLE=eventfacematch-orders-prod
RATE_LIMIT_TABLE=eventfacematch-ratelimit-prod
REVOKED_TOKENS_TABLE=eventfacematch-revoked-tokens-prod

SMTP_HOST=<e.g. email-smtp.eu-central-1.amazonaws.com>
SMTP_PORT=587
SMTP_USER=<...>
SMTP_PASS=<...>
EMAIL_FROM=noreply@picsonar.ro
EMAIL_FROM_NAME=PicSonar

ALLOWED_ORIGINS=https://picsonar.ro,https://www.picsonar.ro
LOG_LEVEL=info
SIGNED_URL_TTL_SECONDS=3600
MAX_UPLOAD_BYTES=15728640
```

**Removed since 2026-04-19:** all `NETOPIA_*` and `OBLIO_*` variables — Stripe is
the single payment rail and the accountant handles monthly e-Factura
submission manually.

All of the above belong in **Secrets Manager**, not in `.env` committed
anywhere. Serverless references them at deploy via SSM/Secrets Manager
resolvers.
