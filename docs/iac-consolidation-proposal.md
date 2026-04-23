# IaC Consolidation Proposal

> **Status: AWAITING APPROVAL.**
> No files will be renamed, moved, or rewritten until you confirm a direction.
> This document lays out options and a recommendation; implementing any of
> them is a separate, user-approved task.

---

## 1. Current state

| Surface | Tool | File | Notes |
|---|---|---|---|
| Lambda compute + API Gateway + IAM roles | Serverless Framework v3 | `backend/serverless.yml` | ~700 lines, ~25 functions |
| DynamoDB tables (7) | Serverless Framework v3 (inline `resources:` block) | same file | Events, Faces, Photos, Users, Orders, SystemStats, AuditLogs |
| S3 buckets (3) | Serverless Framework v3 (inline) | same file | Raw photos, face index, invoices |
| WAFv2 WebACL + association | Serverless Framework v3 (inline) | same file | Attached to API Gateway |
| SQS DLQ | Serverless Framework v3 (inline) | same file | `ProcessPhotoDLQ` |
| Rekognition collection | **Manually created** (one-off) | — | Created by `createCollection` script, not in IaC |
| CloudFront distribution | **Not in repo** | — | Presumed provisioned via AWS console |
| Route53 records | **Not in repo** | — | Presumed provisioned via AWS console |
| ACM certs | **Not in repo** | — | Presumed provisioned via AWS console |
| S3 bucket for frontend static hosting | **Not in repo** | — | Referenced by the deploy workflow via `FRONTEND_S3_BUCKET` secret |
| Secrets Manager entries | **Not in repo** | — | Documented in `secret-rotation.md`, created manually |
| GitHub OIDC provider + deploy role | **Not in repo** | — | Created once manually |

### What's actually good
- **One file is the source of truth** for the Lambda-facing infra. This is
  already the most-consolidated layout available given the Serverless
  Framework's design.
- IAM policies live next to the functions that need them — low risk of
  drift between policy and actual usage.
- Single-region (`eu-central-1`) simplifies Route53 and CloudFront planning.

### What's fragile
- **Provisioning is split across tools**: Serverless for compute + data
  plane, AWS console for edge (CloudFront, Route53, ACM) and identity
  (Secrets Manager, OIDC provider). Anyone rebuilding prod from scratch has
  no runbook for the console bits.
- **Rekognition collection is click-ops**. If the collection is deleted,
  nothing in `serverless.yml` recreates it.
- **7 DynamoDB tables in one stack** mean a deploy failure on a schema
  migration could roll back *everything*, including the collection-free
  ones that had no changes. CloudFormation's nested-stack pattern would
  isolate blast radius.
- **No state file outside AWS.** Rollback is limited to what CloudFormation
  remembers. A Terraform state file in S3+DynamoDB would give richer
  history and easier drift detection.

---

## 2. Options

### Option A — Stay on Serverless Framework v3, pull stray resources in

Keep the current layout. Extend `serverless.yml` to also define:
- Rekognition collection (via custom CloudFormation resource).
- Frontend S3 bucket + CloudFront distribution + Route53 A record + ACM.
- Secrets Manager entries (references only; actual values populated by the
  secret-rotation runbook).
- The GitHub OIDC provider + deploy role (one-time, maybe in a separate
  `serverless-bootstrap.yml` stack).

**Effort**: ~1.5 engineering days.
**Migration risk**: Low. Existing stack state stays intact; new resources
are additive. If you miss an existing resource, you can `serverless
deploy --import-id` to adopt it without recreation.
**Ongoing cost of ownership**: Same as today. One file to edit, one tool
in CI.

**Drawbacks**:
- Serverless Framework v3 is approaching end-of-life for the free tier
  (v4 has licensing changes). Community has forks (Osls), but it's a
  risk to plan around.
- `serverless.yml` is 700 lines already and growing. It's becoming
  hard to navigate.

---

### Option B — Split: Serverless for compute, Terraform for durable resources

Keep Serverless Framework for Lambda + API Gateway (what it does best).
Move everything durable (DynamoDB tables, S3 buckets, WAF, Rekognition
collection, CloudFront, Route53, Secrets Manager entries, OIDC/IAM) into a
separate **Terraform** module under `infra/terraform/`.

Directory sketch:
```
infra/
  terraform/
    envs/
      dev/main.tf
      staging/main.tf
      prod/main.tf
    modules/
      dynamodb/     # 7 tables w/ common TTL + PITR settings
      s3-app/       # 3 app buckets w/ versioning + lifecycle
      edge/         # CloudFront + Route53 + ACM
      identity/     # OIDC provider + deploy role
      secrets/      # Secrets Manager entries (no values)
    backend.tf      # S3 + DynamoDB state lock
```

**Effort**: ~3–4 days (Terraform code + import existing resources + CI
wiring + team learning curve if unfamiliar).
**Migration risk**: Medium. Importing existing DynamoDB tables and S3
buckets with data into Terraform is well-trodden but requires care — one
wrong `terraform destroy` vaporizes a table. Mitigate with
`prevent_destroy` lifecycle blocks and a state backend that requires MFA.
**Ongoing cost of ownership**: Higher than A. Two tools (Serverless +
Terraform) and two state stores. Benefit: each tool does what it's good at.

**Why it's worth it**:
- DynamoDB schema changes decouple from Lambda deploys. A bad new function
  doesn't force a DB rollback.
- Terraform's plan output is **much** clearer than CloudFormation's
  change-set diff for data-plane resources.
- State drift detection (`terraform plan` on a schedule) catches manual
  console changes.

---

### Option C — Migrate entirely to AWS CDK (TypeScript)

Full rewrite of both compute and data-plane into CDK. Synthesizes to
CloudFormation under the hood, so deployment mechanics don't change, but
the code is TypeScript next to the rest of the codebase and benefits from
type-checking.

**Effort**: ~5–7 days. This is the most work.
**Migration risk**: Medium-high. Every existing resource has to be
imported into a new CloudFormation stack (CDK stacks are new stacks —
you can't adopt an existing Serverless Framework stack as-is). Strategy:
`cdk import` supports bringing in existing resources one at a time.
**Ongoing cost of ownership**: Low-medium once converted. Single language,
single tool, type-checked infra, excellent IDE support.

**Why someone would pick it**:
- TypeScript constructs > YAML for non-trivial infra logic.
- First-class AWS support (it's an AWS product).
- L2 constructs encode AWS best practices by default (e.g. encryption on
  by default for DynamoDB).

**Why someone wouldn't**:
- The biggest win (type safety, composition) matters most when infra is
  large or the team is large. With one infra author and ~20 resources, the
  cost of the rewrite may not pay back for months.

---

### Option D — Do nothing IaC-side, only add missing runbooks

Accept that current state works. Instead of consolidating tools, write a
**provisioning runbook** (`docs/runbooks/bootstrap-aws-account.md`) that
lists every console-created resource with the exact steps to recreate it
from scratch.

**Effort**: ~0.5 day.
**Migration risk**: None.
**Ongoing cost of ownership**: Lowest — but the divergence between repo
and reality stays where it is, and a DR exercise still involves a lot of
clicking.

---

## 3. Recommendation

**Option A** (stay on Serverless Framework, pull stray resources in) is
the recommended path for the next 3–6 months, with a follow-up to
**Option B** if and when the backend grows past its current size.

Reasoning:
1. You have one product, one region, and (I assume) one infra author. The
   marginal value of a second tool today is low.
2. The biggest concrete risk — Rekognition collection being click-ops —
   is trivially fixed by adding ~15 lines of CloudFormation to
   `serverless.yml`. Same story for the frontend S3 bucket + CloudFront.
3. Serverless Framework v3 is still supported. v3 → v4 migration is a
   future problem, and when it arrives, it's a good forcing function to
   consider Option B or C.
4. Option D alone is not enough: a runbook is not a substitute for code
   when the resource is recreated often or has complex config (CloudFront
   OAI, WAF rules).

**What I'd do right now under Option A:**
- Extend `serverless.yml` with Rekognition collection + frontend S3
  bucket + CloudFront + Route53 + ACM cert.
- Pull Secrets Manager entries into the stack as empty shells (names only,
  populated by the rotation runbook).
- Add a separate tiny `serverless-bootstrap.yml` for the GitHub OIDC
  provider + deploy role (deployed once per AWS account, not per stage).
- Keep the DynamoDB + SQS + WAF bits exactly where they are.

**When to revisit (triggers for Option B):**
- `serverless.yml` exceeds ~1500 lines.
- A second backend service is added (microservice split).
- You add a second region for DR.
- A schema migration causes a full-stack rollback on dev and costs >1h
  downtime — that's the moment to isolate DynamoDB into its own tool.

---

## 4. What I need from you

Pick one and reply:

- **[A] Approve Option A.** I'll produce a single PR that adds the missing
  resources to `serverless.yml` + the bootstrap file. Estimated diff: ~250
  lines. No existing resource is touched — everything is additive, so the
  blast radius is limited to the new resources themselves.
- **[B] Approve Option B.** I'll scaffold `infra/terraform/` with module
  stubs and a migration plan broken into small PRs (import DynamoDB first,
  then S3, then edge). No imports happen without your explicit go-ahead on
  each stage.
- **[C] Approve Option C.** I'll scaffold a `cdk/` directory and a
  resource-by-resource import plan. Larger commitment; would recommend
  only if you plan to grow the product significantly.
- **[D] Approve Option D.** I'll write
  `docs/runbooks/bootstrap-aws-account.md` only.
- **[S] Skip for now.** Close this task; nothing changes.

Whatever you pick, the work happens in a branch with its own PR. No
infra is touched on `main` without a review.
