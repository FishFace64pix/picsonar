# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**PicSonar** (repo: EventFaceMatch) is a serverless SaaS platform for AI-powered event photo delivery. Photographers upload photos to an event; guests scan a QR code, take a selfie, and the system uses AWS Rekognition to return only photos containing that guest's face.

## Monorepo Structure

Three workspaces managed from the root:
- `backend/` — Serverless Framework + Lambda + TypeScript
- `frontend/` — React 18 + Vite + TypeScript
- `packages/shared/` — Shared types, Zod schemas, constants (`@picsonar/shared`)

## Commands

From the **root**:
```bash
npm run dev           # Start frontend only (Vite)
npm run dev:backend   # Start backend serverless offline on port 3000
npm run dev:all       # Run both concurrently
npm run build         # Build shared + frontend
npm run lint          # Lint all workspaces
npm run typecheck     # Type-check all workspaces
npm run test          # Run all tests
npm run deploy        # Deploy backend to AWS
npm run format        # Prettier format
```

From **`backend/`**:
```bash
npm test                          # Run all Jest tests
npx jest tests/matchFace.test.ts  # Run a single test file
npx tsc --noEmit                  # Type-check only
serverless deploy --stage prod    # Deploy to specific stage (dev|staging|prod)
serverless invoke -f matchFace    # Invoke a deployed function
```

From **`frontend/`**:
```bash
npm run dev         # Vite dev server
npm run build       # tsc + vite build
npm run test        # vitest run (single pass)
npm run test:watch  # vitest watch mode
npm run e2e         # Playwright end-to-end tests
```

## Architecture

### Request Flow

```
Browser → API Gateway → Lambda Handler → DynamoDB / S3 / Rekognition
```

Every Lambda function is wrapped by `backend/src/middleware/handler.ts` which handles CORS, AppError → HTTP status mapping, correlation ID propagation, and latency/error metric emission.

### Middleware Pipeline (backend)

- `requireAuth()` / `requireAdmin()` / `tryAuth()` — JWT extraction and verification (`src/middleware/auth.ts`)
- `parseBody()` / `parsePath()` / `parseQuery()` — Zod validation (`src/middleware/validate.ts`)
- `checkOwnership()` — Verifies the authenticated user owns the target event (`src/middleware/ownership.ts`)
- `rateLimit()` — DynamoDB-backed sliding-window rate limiter (`src/middleware/rateLimit.ts`)

### Photo Processing Pipeline (async)

`uploadPhoto` → S3 presigned URL → guest uploads → S3 trigger fires `processPhoto` Lambda → Jimp thumbnail → Rekognition `IndexFaces` → DynamoDB Face + Photo records written. Failed processing goes to SQS DLQ.

### Face Matching

`matchFace` (no auth required, WAFv2 rate-limited at edge) → receives selfie image → Rekognition `SearchFacesByImage` against event's collection → returns matched Photo records with presigned S3 download URLs.

### Payment + Credit Flow

Stripe Payment Intent → `stripeWebhook` Lambda → `payment_intent.succeeded`: create Order, apply credits (atomic DynamoDB update), generate PDF invoice (PDFLib), send receipt email (Nodemailer/Brevo SMTP). Credits are integer minor units (bani) throughout — never floats.

## Key Patterns

### Atomic Operations
Event creation deducts credits with a DynamoDB `ConditionExpression` to prevent double-spend. On failure, credits are refunded in a best-effort compensation step with a CloudWatch metric emitted on failure.

### Idempotency
Stripe webhook handlers are keyed on `paymentIntentId` — safe for Stripe retries. Token revocation uses a TTL-keyed DynamoDB table (`eventfacematch-revoked-tokens-{stage}`).

### Environment Configuration
`backend/src/config/env.ts` uses Zod to validate all required env vars at Lambda cold start. Missing vars throw immediately rather than failing at runtime. Table/bucket names are stage-suffixed and injected via `serverless.yml`.

### Shared Types
`packages/shared/` is the single source of truth for cross-cutting types (`User`, `Event`, `Photo`, `Face`, `Order`), Zod schemas (e.g., `CreateEventSchema`, `LoginSchema`), and constants (`PACKAGES`, `QUOTA`). Import via `@picsonar/shared` in both frontend and backend.

### DynamoDB Access
All DynamoDB operations go through `backend/src/utils/dynamodb.ts` helpers (`putItem`, `queryItems`, `queryItemsPage`, `batchGetItems`, etc.). Pagination uses base64-encoded cursors. Batch reads auto-chunk at 25 items with exponential backoff retry.

### Error Handling
`AppError` (from `backend/src/utils/errors.ts`) carries an HTTP status code and is caught by the handler wrapper. Throw `AppError` for expected failures; unhandled errors become 500s with a CloudWatch metric.

## Infrastructure Notes

- **Region**: `eu-central-1`
- **Runtime**: Node.js 20.x, 512 MB memory, 30s timeout
- **8 DynamoDB tables** per stage, all with Point-in-Time Recovery and encryption at rest. GSIs are defined in `serverless.yml`.
- **3 S3 buckets** per stage: raw photos (180-day lifecycle), face index data (180-day), invoices (90-day → Glacier, 5-year full retention per Romanian fiscal law).
- **WAFv2** rate limits: `/match-face` and `/auth/login` at 100 req/5min per IP.
- **Account lockout**: 5 failed login attempts → 15-minute lockout stored in DynamoDB.
- **JWT**: Access token + refresh token pair; revoked tokens tracked via TTL table.
- Stages: `dev` (14-day logs), `staging` (30-day), `prod` (90-day, SNS alarms active).

## Frontend Notes

- Path alias `@/*` maps to `frontend/src/*`.
- API calls use Axios instances from `frontend/src/api/`.
- Server state managed by **TanStack React Query** — prefer query invalidation over manual state updates.
- Forms use **React Hook Form** + Zod resolvers.
- i18n via **i18next** (multiple languages); add new strings to all locale files.
- Webcam capture (`react-webcam`) is used for the guest face-match selfie flow in `GuestScanPage`.
