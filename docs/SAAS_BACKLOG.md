# SaaS Backlog — deferred work

The launch-critical SaaS fundamentals are done (see
`PRODUCTION_READINESS_STATUS.md`). This document tracks the
nice-to-haves that didn't make it into the launch cut but are worth
picking up in early-life iterations.

Items are grouped by theme, roughly ordered by expected impact.

## Observability & tooling

- **Sentry frontend integration.** `@sentry/react` + `Sentry.init()` in
  `main.tsx`, wire `ErrorBoundary.componentDidCatch` to forward to
  Sentry with the trace id. Backend pino logs already carry correlation
  ids; linking them end-to-end needs `sentry.addBreadcrumb` on each
  axios request.
- **Backend error forwarding to Sentry.** The `withHandler` middleware
  already logs errors; add a `Sentry.captureException` branch for
  severity ≥ warn.

## Growth & UX

- **Per-page meta tags via `react-helmet-async`.** Drop-in provider in
  `App.tsx`, per-page `<Helmet>` in the ~10 public SEO-relevant routes
  (landing, pricing, contact, legal pages). Include OG / Twitter card
  tags for social share cards.
- **i18n default to RO + locale-aware formatting.** `i18n.ts` already
  detects the browser locale; flip the default fallback from EN to RO,
  and replace ad-hoc date / currency formatting in pages with a shared
  `useLocaleFormat()` hook that returns bound `Intl.DateTimeFormat` /
  `Intl.NumberFormat` instances.

## Transactional email suite

The minimum set (reset password, email verify, invoice receipt,
payment-failed) ships now. Add over the first 30 days:

- Welcome email (fires after email verification, not registration)
- Password-changed security alert ("if this wasn't you …")
- Event-processing complete (for async batch uploads)
- Pre-expiry credit warning (7 days before subscription renewal)
- Refund confirmation

## Infra & ops

- **Scheduled purge job for soft-deleted accounts.** A CloudWatch-
  triggered Lambda that scans `USERS_TABLE` for rows with
  `purgeAt <= now()` and cascade-deletes: events → photos → Rekognition
  faces → user row. Invoices are retained per fiscal law and re-point
  to a synthetic "deleted-user" stub.
- **GDPR deletion audit log.** Persist every deletion + export request
  to `AUDIT_LOGS_TABLE` with IP + UA so we can prove compliance if a
  supervisory authority ever asks.
- **Stripe webhook replay runbook.** Document how to re-fire a failed
  webhook from the Stripe dashboard and confirm idempotency. The
  webhook already handles double-delivery via `existing.status`
  guards.
- **CI step: type-check the shared package before backend.** We hit
  drift a few times where backend rebuilds passed locally but broke CI
  because `@picsonar/shared` hadn't been rebuilt. Add `npm run
  build:shared` as the first CI step.

## Product polish

- **Unverified-email dashboard banner.** We gate paid flows on
  `emailVerified`; show a persistent banner with a "resend" button for
  users whose email is still unverified.
- **"Delete my account" UI.** Backend endpoint exists
  (`POST /auth/delete-account`); build the confirmation modal on
  `/profile` with the 30-day grace explainer.
- **"Download my data" UI.** Backend endpoint exists
  (`GET /auth/export-data`); add a one-click button on `/profile`.

## Compliance & legal

- **DPIA (Data Protection Impact Assessment).** Face recognition
  processing arguably falls under GDPR Art. 35 as it's "systematic
  processing of biometric data on a large scale". A formal DPIA is not
  launch-blocking but should be commissioned within 90 days.
- **Romanian ANPC registration.** Confirm the company is listed with
  ANPC as a distance-selling merchant. Our Consumer Rights page links
  to the ANPC complaint form, but we should also appear in ANPC's
  registry.

## Security — future iterations

- **WebAuthn / passkey login.** Reduces the password-phishing attack
  surface. Plug into the existing JWT issuance flow.
- **Rate limit on per-user event creation.** Existing rate limit is
  global-per-endpoint; a logged-in abuser could still burn through
  Rekognition quota. Add a per-user second tier.
- **IP allowlist for admin endpoints.** A separate API Gateway
  authorizer that checks `sourceIp ∈ allowlist`. Currently admin
  endpoints are protected by `requireAdmin` (JWT `role === 'admin'`)
  only.
