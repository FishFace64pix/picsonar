# Local Development Runbook

How to run PicSonar end-to-end on your laptop for hands-on testing.

There is **no 100%-offline mode** — Rekognition has no local mock and
DynamoDB Local would force us to maintain a fork of the schema. The
pragmatic pattern is a **hybrid**:

- Frontend → `vite` on `http://localhost:5173`
- Backend Lambdas → `serverless offline` on `http://localhost:3000`
- DynamoDB / S3 / Rekognition / SES → real AWS resources on the **`dev` stage**
- Stripe → test mode + `stripe listen` forwarding webhooks to localhost

This gives you a full happy-path test loop (register, upload, match,
pay, download) while costing pennies on AWS and never touching prod.

---

## 1. One-time prereqs

| Tool          | Why                              | Install |
| ------------- | -------------------------------- | ------- |
| Node 20.11+   | Workspaces + Vite 5 + Lambda 20  | https://nodejs.org or `nvm install 20` |
| npm 10+       | Bundled with Node 20             | — |
| AWS CLI v2    | Credential plumbing              | `winget install Amazon.AWSCLI` (Win) / `brew install awscli` (mac) |
| Serverless v3 | Already pinned in `backend/`     | `npm i -g serverless@3` (optional; `npx sls` works too) |
| Stripe CLI    | Webhook forwarding in test mode  | https://stripe.com/docs/stripe-cli |
| Git           | Obviously                        | — |

### AWS credentials

You need an AWS account with the ability to deploy CloudFormation stacks
in `eu-central-1`. Configure a profile once:

```bash
aws configure --profile picsonar-dev
# Access key / secret from your IAM user (needs: iam:*, dynamodb:*, s3:*,
# lambda:*, apigateway:*, cloudformation:*, logs:*, rekognition:*,
# events:*, sqs:*, sns:*, cloudwatch:*)
export AWS_PROFILE=picsonar-dev   # bash
# setx AWS_PROFILE picsonar-dev   # Windows (new terminal after)
```

Quick sanity check:

```bash
aws sts get-caller-identity
```

---

## 2. Repo install

```bash
git clone https://github.com/<you>/EventFaceMatch.git
cd EventFaceMatch

# root install hydrates all workspaces (frontend + backend + shared)
npm install

# build the shared package once so backend/frontend pick up types
npm run build --workspace=@picsonar/shared
```

If you change anything in `packages/shared/src/**`, re-run the shared
build or run it in watch mode:

```bash
npm run build --workspace=@picsonar/shared -- --watch
```

---

## 3. First-time AWS bootstrap (dev stage)

Deploys the full CFN stack to `eu-central-1` under stage `dev`.
This creates DynamoDB tables, S3 buckets, the Rekognition collection,
API Gateway, the SQS DLQ, and the CloudWatch alarms.

```bash
cd backend
npx serverless deploy --stage dev
# After the stack is up, make sure the Rekognition collection exists:
npm run ensure:rekognition
```

The deploy prints table names and the API endpoint — **copy them**. You
will paste them into `backend/.env` in the next step.

If this is the first time anyone in your account deploys:
- Create the IAM OIDC identity provider + deploy role per
  `docs/runbooks/secret-rotation.md` §5 (only needed for GitHub Actions,
  not for local dev).
- Subscribe an email to `picsonar-alarms-dev` SNS topic if you want
  alarm emails.

---

## 4. Local `.env` files

### `backend/.env`

Copy the template and fill real values. **The backend uses a fail-fast
env validator** (zod in `src/config/env.ts`) — one missing required var
and the handler crashes with a readable error on first request.

```bash
cp backend/.env.example backend/.env
```

Then edit `backend/.env`:

```bash
NODE_ENV=development
AWS_REGION=eu-central-1
STAGE=dev

# 64-char hex, generate with:
#   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=<paste here>
JWT_REFRESH_SECRET=<paste here — must be different from JWT_SECRET>

# Tables & buckets — paste the exact names printed by `sls deploy --stage dev`.
USERS_TABLE=eventfacematch-users-dev
EVENTS_TABLE=eventfacematch-events-dev
PHOTOS_TABLE=eventfacematch-photos-dev
FACES_TABLE=eventfacematch-faces-dev
ORDERS_TABLE=eventfacematch-orders-dev
AUDIT_LOGS_TABLE=eventfacematch-audit-logs-dev
SYSTEM_STATS_TABLE=eventfacematch-system-stats-dev
RATE_LIMITS_TABLE=eventfacematch-rate-limits-dev

RAW_PHOTOS_BUCKET=eventfacematch-raw-photos-dev
FACE_INDEX_BUCKET=eventfacematch-face-index-dev
QR_CODES_BUCKET=eventfacematch-qr-codes-dev
INVOICES_BUCKET=eventfacematch-invoices-dev

REKOGNITION_COLLECTION_ID=eventfacematch-collection-dev

# Stripe — use TEST keys (Dashboard → Developers → API keys → reveal test key)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...            # filled in section 6
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Oblio stays disabled locally (matches prod decision: accountant does e-Factura)
OBLIO_ENABLED=false

# Email: for local, easiest is Brevo test SMTP or Ethereal (see section 7)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=<your Brevo SMTP user>
SMTP_PASS=<your Brevo SMTP pass>
EMAIL_FROM=no-reply@picsonar.com
EMAIL_FROM_NAME=PicSonar

ALLOWED_ORIGINS=http://localhost:5173
LOG_LEVEL=debug
SIGNED_URL_TTL_SECONDS=3600
MAX_UPLOAD_BYTES=15728640
FRONTEND_URL=http://localhost:5173
```

### `frontend/.env` (or `.env.local`)

```bash
cp frontend/.env.example frontend/.env
```

```bash
VITE_API_BASE_URL=http://localhost:3000/dev
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_USE_MOCK=false
```

`VITE_*` vars are inlined at build time — restart `vite` after editing.

---

## 5. Start the app

Two processes. Either run them side-by-side with the convenience script
or open two terminals.

### Option A — one command (preferred)

```bash
# from repo root
npm run dev:all
```

This uses `concurrently` to run `frontend` (vite, port 5173) and
`backend` (serverless offline, port 3000) in the same terminal with
colored prefixes.

### Option B — two terminals

```bash
# terminal 1
cd backend
npm run dev              # serverless offline on :3000

# terminal 2
cd frontend
npm run dev              # vite on :5173
```

Open http://localhost:5173. The SPA should load. Network requests to
`/api/*` hit `http://localhost:3000/dev/*`.

Sanity checks:

```bash
curl http://localhost:3000/dev/health       # { "ok": true }
curl http://localhost:5173                  # <!doctype html>...
```

---

## 6. Stripe webhook forwarding

`stripeWebhook` is signed-webhook-only. Without `stripe listen`, the
handler rejects unsigned requests and payment flows appear broken.

```bash
# one-time login (opens browser)
stripe login

# start forwarder — leave it running in its own terminal
stripe listen \
  --forward-to http://localhost:3000/dev/webhook/stripe \
  --events payment_intent.succeeded,payment_intent.payment_failed
```

The first time, Stripe CLI prints:

```
Ready! Your webhook signing secret is whsec_xxx (^C to quit)
```

Copy that `whsec_...` into `backend/.env` as `STRIPE_WEBHOOK_SECRET`
**and restart serverless offline** so the new value is picked up.

To trigger a test payment manually without touching the UI:

```bash
stripe trigger payment_intent.succeeded
```

Use Stripe's standard test cards: `4242 4242 4242 4242` (success),
`4000 0027 6000 3184` (requires 3DS).

---

## 7. Email in local dev

The backend expects valid SMTP and will fail env validation if it's
missing. Two working options:

**A. Brevo test SMTP (already in your `.env`)** — real deliverable
emails (good for testing the password-reset flow end-to-end). Keep your
test inbox open.

**B. Ethereal (throwaway catch-all)** — no real delivery, renders every
sent email at a web URL.

```bash
# generate a throwaway account
npx create-ethereal-email
```

Paste the printed `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` into
`backend/.env`. View captured emails at the URL Ethereal prints.

---

## 8. Seed a test user

Instead of clicking through /register every time, drop a known user
straight into DynamoDB:

```bash
# from repo root
npm run seed:test-user
```

Output:

```
✔ Seeded test user
  email:    test@local.dev
  password: Test1234!
  userId:   <uuid>
```

Log in at http://localhost:5173/login with those credentials.

Re-run the script to rotate the password; it's idempotent (keyed by
email).

---

## 9. Typical test loops

### Auth
1. `/register` with a real-looking Romanian CNP, phone, address.
2. Check inbox for verification email (Ethereal web UI or Brevo).
3. `/login`, confirm dashboard loads, hard-refresh → should silently
   refresh access token via axios interceptor.

### Event + upload
1. Dashboard → Create Event → fill event name + date.
2. Upload a zip of photos. Lambda indexes faces via Rekognition (real
   AWS). Watch logs in the serverless-offline terminal.

### Face match
1. Open the event's public URL (print in the UI after creation).
2. Allow camera, take a selfie. Matches return JSON within seconds.

### Payment
1. Before download, buyer clicks "Pay to unlock".
2. Uses card `4242 4242 4242 4242`, any future date, any CVC.
3. Stripe CLI forwards `payment_intent.succeeded` → backend webhook →
   Order marked `PAID`, credit applied, download URL unlocks.
4. **Oblio is off** (matches prod decision) — the order is marked
   `invoiceProvider: 'local-pdf'`. Monthly Stripe export gets handed to
   your accountant for ANAF submission.

---

## 10. Useful debug commands

```bash
# tail logs for a specific dev Lambda
npx sls logs -f createPaymentIntent --stage dev --tail

# dynamo dump (requires awscli)
aws dynamodb scan --table-name eventfacematch-users-dev | jq .

# delete a test user
aws dynamodb delete-item \
  --table-name eventfacematch-users-dev \
  --key '{"userId":{"S":"<uuid>"}}'

# nuke the dev Rekognition collection (will be recreated next deploy)
aws rekognition delete-collection --collection-id eventfacematch-collection-dev

# full tear-down of dev stack (no prod risk; everything is -dev)
cd backend && npx sls remove --stage dev
```

---

## 11. Common pitfalls

| Symptom | Likely cause | Fix |
| ------- | ------------ | --- |
| `Invalid or missing environment variables: ...` at boot | `.env` not populated after `sls deploy` | Paste real values; restart `sls offline` |
| `CORS error` in browser | `ALLOWED_ORIGINS` doesn't include `http://localhost:5173` | Update `.env`, restart backend |
| Stripe webhook returns 400 | `STRIPE_WEBHOOK_SECRET` mismatch vs. what `stripe listen` emitted | Copy the latest `whsec_...`, restart backend |
| `ResourceNotFoundException: Rekognition collection` | First deploy skipped the post-deploy script | `npm --workspace=eventfacematch-backend run ensure:rekognition` |
| Long cold start (3-5s) on every request | Expected with `sls offline` (no warm Lambda caching) | Live with it or use `serverless-offline --reloadHandler` |
| Upload returns 413 | File larger than `MAX_UPLOAD_BYTES` | Adjust env or compress |
| Frontend doesn't see `.env` changes | Vite snapshots env at start | Stop + restart `npm run dev` |
| Port 3000 already in use | Another service | `lsof -i :3000` (mac/Linux) / `netstat -ano | findstr :3000` (Win), kill it |

---

## 12. Running the test suites

```bash
# unit tests — no AWS needed
npm run test                         # both workspaces
npm --workspace=backend run test
npm --workspace=frontend run test

# e2e smoke (requires both dev servers running)
cd frontend
npx playwright install               # one-time browser download
npm run e2e
```

---

## 13. What's *not* in scope for local dev

- **Custom domain + CloudFront** — prod only; local uses vite's dev
  server and the raw API Gateway URL.
- **WAFv2 rules** — prod only; won't interfere locally.
- **SES production access** — use Brevo or Ethereal in dev.
- **Oblio e-Factura** — kept disabled per the project-wide decision;
  there's a feature-flagged path in `backend/src/services/invoicing/`
  if you ever want to exercise it in staging.

---

## 14. Clean up between sessions

```bash
# kill node processes and free up 3000 / 5173
pkill -f "vite|serverless"

# reset npm install drift (rare)
rm -rf node_modules */node_modules packages/*/node_modules
npm install
```

That's it. If something blocks you, grep `LOG_LEVEL=debug` logs first —
the `traceId` in every line threads a request across FE → BE → DynamoDB.
