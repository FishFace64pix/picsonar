# Secret Rotation Runbook

Scope: every production-sensitive credential PicSonar depends on — JWT signing
keys, Stripe API keys, Netopia merchant signature, SMTP password, the GitHub
OIDC deploy role trust policy, and AWS access keys (if any are still
outstanding after the migration to OIDC).

Secrets of record live in **AWS Secrets Manager**, path prefix
`/picsonar/<stage>/...`. Nothing sensitive should ever be in `.env` committed
to git, in GitHub Actions repo secrets (except the deploy role ARN, which is
not sensitive), or in local shell history.

> **Execute these steps yourself.** This runbook is written so a human
> operator can follow it end-to-end; do not hand it to an automated agent
> without supervision.

---

## 0. Before you start

1. Confirm you have **break-glass access**: an IAM user (not federated) with
   the `PicSonarBreakGlass` policy attached, and MFA enrolled. You will only
   use this if normal deploy flows fail.
2. Make sure you're on a trusted machine. Terminal history should be
   disabled for the session: `unset HISTFILE` (bash) or
   `Set-PSReadlineOption -HistorySaveStyle SaveNothing` (PowerShell).
3. Open two terminals — one for AWS CLI, one for editing config / committing
   changes. Do not paste new secrets into chat windows.

---

## 1. JWT signing key (`JWT_SECRET`, `JWT_REFRESH_SECRET`)

### When to rotate
- Suspected leak (anyone saw the value, laptop compromise, former employee).
- Scheduled: every **90 days**.
- Immediately before public launch, once more after launch.

### Why it's delicate
Rotating `JWT_SECRET` invalidates every existing access token. That's fine
— they expire in 15 min anyway. Rotating `JWT_REFRESH_SECRET` logs every
user out. Acceptable in an emergency; avoid during peak hours for scheduled
rotations.

### Procedure
```bash
# 1. Generate two strong secrets (64 bytes base64).
NEW_ACCESS=$(openssl rand -base64 64 | tr -d '\n')
NEW_REFRESH=$(openssl rand -base64 64 | tr -d '\n')

# 2. Write the new values to Secrets Manager (prod).
aws secretsmanager put-secret-value \
  --region eu-central-1 \
  --secret-id /picsonar/prod/jwt \
  --secret-string "{\"accessSecret\":\"$NEW_ACCESS\",\"refreshSecret\":\"$NEW_REFRESH\"}"

# 3. Force a Lambda cold-restart so every container picks up the new value.
#    The simplest way is to redeploy; an env tweak on the functions works too.
cd backend
npx serverless deploy --stage prod --region eu-central-1 --verbose

# 4. Verify: login from a clean browser, confirm new tokens work.
#    Old tokens will 401 — this is expected.
```

### Rollback
If the new secret is corrupted or the deploy failed mid-way, re-deploy with
the previous Secrets Manager version:
```bash
aws secretsmanager list-secret-version-ids --secret-id /picsonar/prod/jwt
aws secretsmanager restore-secret --secret-id /picsonar/prod/jwt
# or
aws secretsmanager update-secret-version-stage \
  --secret-id /picsonar/prod/jwt \
  --version-stage AWSCURRENT --move-to-version-id <previous-version-id>
```

---

## 2. Stripe API keys

### When to rotate
- Key visible in git history, logs, or an LLM chat window.
- After a Stripe-announced security incident.
- Scheduled: every **180 days** or when an employee with access departs.

### Procedure
1. Open the [Stripe dashboard → Developers → API keys](https://dashboard.stripe.com/apikeys).
2. Click **Roll key** on the **Secret key** (`sk_live_...`). Stripe issues a
   new one and keeps the old one valid for 12 hours.
3. Update Secrets Manager:
   ```bash
   aws secretsmanager put-secret-value \
     --region eu-central-1 \
     --secret-id /picsonar/prod/stripe \
     --secret-string "{\"secretKey\":\"sk_live_NEW\",\"webhookSecret\":\"whsec_NEW\",\"publishableKey\":\"pk_live_NEW\"}"
   ```
4. Redeploy backend so Lambdas pick up the new secret.
5. Also update the **publishable key** in the frontend `.env.production` and
   redeploy the frontend (publishable key is not secret, but keep it in sync).
6. **Webhook secret** must be rotated separately if Stripe issued a new one:
   Dashboard → Developers → Webhooks → endpoint → **Roll secret**. Update
   `webhookSecret` in the same Secrets Manager entry in the same step.
7. Within 12 hours, disable the old key from the Stripe dashboard.

### Verification
```bash
# Healthy webhook round-trip — Stripe sends a test event.
stripe listen --forward-to https://api.picsonar.ro/webhook/stripe
```

---

## 3. Netopia merchant signature

Netopia's RSA keypair used to sign payment requests and verify IPN
callbacks. **Rotation requires Netopia's cooperation** — you cannot self-serve.

1. Email Netopia merchant support with your merchant ID, asking to rotate
   the signing key. They'll issue a new keypair (public + private PEM).
2. Store both files in Secrets Manager (the private key is the sensitive one):
   ```bash
   aws secretsmanager put-secret-value \
     --region eu-central-1 \
     --secret-id /picsonar/prod/netopia \
     --secret-string "$(jq -Rn --arg priv "$(cat netopia_private.pem)" --arg pub "$(cat netopia_public.pem)" --arg mid "YOUR_MERCHANT_ID" '{privateKeyPem:$priv, publicKeyPem:$pub, merchantId:$mid}')"
   ```
3. Redeploy backend.
4. Issue a 1 RON test charge through a sandbox order to confirm signature
   verification still works.
5. Destroy the PEM files from disk with `shred -u netopia_private.pem`
   (Linux) or `sdelete -p 3 -z netopia_private.pem` (Windows).

---

## 4. SMTP credentials

Standard procedure: generate a new app password in the SMTP provider console
(SES, SendGrid, or whichever is in use), put it in
`/picsonar/prod/smtp`, redeploy, delete the old password from the provider.

---

## 5. GitHub Actions deploy role (OIDC)

The role itself does not have a rotatable secret — assume-role is gated by
the GitHub OIDC provider. What you rotate here is the **trust policy**, to
restrict which repos/branches can assume it.

```bash
# View current trust policy.
aws iam get-role --role-name PicSonarDeployRole \
  --query 'Role.AssumeRolePolicyDocument' --output json

# Update it (example: lock to specific repo + main branch only).
aws iam update-assume-role-policy \
  --role-name PicSonarDeployRole \
  --policy-document file://trust-policy.json
```

Trust policy template (`trust-policy.json`):
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
      },
      "StringLike": {
        "token.actions.githubusercontent.com:sub": "repo:<ORG>/<REPO>:ref:refs/heads/main"
      }
    }
  }]
}
```

---

## 6. Residual IAM access keys

Goal: **zero** long-lived access keys in production. Audit quarterly:

```bash
aws iam list-users --query 'Users[].UserName' --output text | \
  while read u; do
    aws iam list-access-keys --user-name "$u" \
      --query "AccessKeyMetadata[].{User:UserName,AccessKey:AccessKeyId,Created:CreateDate,Status:Status}" \
      --output table
  done
```

For any key older than 90 days or belonging to a former user, rotate or
delete:
```bash
aws iam create-access-key --user-name <user>
# update wherever it's used
aws iam update-access-key --user-name <user> --access-key-id <old> --status Inactive
# wait 48 hours, confirm nothing broke
aws iam delete-access-key --user-name <user> --access-key-id <old>
```

---

## 7. After any rotation

1. Run post-deploy smoke tests: `npm run e2e` against the deployed URL.
2. Spot-check CloudWatch for 401/5xx spikes in the 30 min after the change.
3. Log the rotation in the `docs/runbooks/rotation-log.md` file (create if
   missing) — date, who did it, which secret, reason. This is the paper
   trail for SOC2 if you ever pursue it.
4. If the rotation was triggered by a suspected leak: open a
   postmortem ticket, review access logs, and consider whether other
   secrets on the same machine may have been compromised.
