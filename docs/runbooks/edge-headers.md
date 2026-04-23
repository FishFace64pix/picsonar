# CloudFront Response Headers Runbook

Security headers that must live at the CDN edge, not in the Lambda. Meta
CSP in `index.html` is a backup — the canonical policy goes here.

## Why CloudFront, not Lambda / meta

- `frame-ancestors` directive is ignored in `<meta>` CSP — only respected
  when sent as an HTTP response header.
- `Strict-Transport-Security` with `preload` eligibility requires the
  header on every response, including static assets.
- CloudFront Response Headers Policies are free, versioned, and attached
  to a distribution with one CLI call.

## Create the policy

```bash
cat > /tmp/picsonar-security-headers.json <<'EOF'
{
  "Name": "picsonar-security-headers",
  "Comment": "Security + CORS headers for picsonar.ro distributions",
  "SecurityHeadersConfig": {
    "StrictTransportSecurity": {
      "Override": true,
      "IncludeSubdomains": true,
      "Preload": true,
      "AccessControlMaxAgeSec": 63072000
    },
    "ContentTypeOptions": { "Override": true },
    "FrameOptions": { "Override": true, "FrameOption": "DENY" },
    "ReferrerPolicy": {
      "Override": true,
      "ReferrerPolicy": "strict-origin-when-cross-origin"
    },
    "XSSProtection": {
      "Override": true,
      "Protection": true,
      "ModeBlock": true
    },
    "ContentSecurityPolicy": {
      "Override": true,
      "ContentSecurityPolicy": "default-src 'self'; script-src 'self' https://js.stripe.com https://m.stripe.network; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.cloudfront.net https://*.amazonaws.com; font-src 'self' data:; connect-src 'self' https://*.execute-api.eu-central-1.amazonaws.com https://api.picsonar.ro https://api.stripe.com https://m.stripe.network; frame-src https://js.stripe.com https://hooks.stripe.com; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests"
    }
  },
  "CustomHeadersConfig": {
    "Items": [
      { "Header": "Permissions-Policy",
        "Value": "accelerometer=(), camera=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(self), usb=()",
        "Override": true
      },
      { "Header": "Cross-Origin-Opener-Policy",
        "Value": "same-origin",
        "Override": true
      },
      { "Header": "Cross-Origin-Resource-Policy",
        "Value": "same-site",
        "Override": true
      }
    ]
  }
}
EOF

aws cloudfront create-response-headers-policy \
  --response-headers-policy-config file:///tmp/picsonar-security-headers.json
```

Note `Permissions-Policy` keeps `camera=(self)` and `payment=(self)` because
selfie capture + Stripe Payment Request both need those.

## Attach to distribution

```bash
# Grab the current config.
aws cloudfront get-distribution-config --id <DIST_ID> > /tmp/dist.json

# Extract ETag for the update call.
ETAG=$(jq -r '.ETag' /tmp/dist.json)

# Patch in the response-headers-policy-id on the default cache behavior.
POLICY_ID=$(aws cloudfront list-response-headers-policies \
  --query 'ResponseHeadersPolicyList.Items[?ResponseHeadersPolicyConfig.Name==`picsonar-security-headers`].Id | [0]' \
  --output text)

jq --arg pid "$POLICY_ID" \
  '.DistributionConfig.DefaultCacheBehavior.ResponseHeadersPolicyId = $pid' \
  /tmp/dist.json > /tmp/dist-updated.json

aws cloudfront update-distribution \
  --id <DIST_ID> \
  --distribution-config "$(jq .DistributionConfig /tmp/dist-updated.json)" \
  --if-match "$ETAG"
```

## Verify

```bash
curl -sI https://picsonar.ro | grep -iE 'strict-transport|content-security|referrer-policy|x-frame-options|permissions-policy'
```

Expect every listed header, with the CSP containing `frame-ancestors 'none'`.

## Rollback

If a header breaks the site, remove the policy attachment:
```bash
# same pattern as above but set ResponseHeadersPolicyId to empty string
jq '.DistributionConfig.DefaultCacheBehavior.ResponseHeadersPolicyId = ""' /tmp/dist.json > /tmp/dist-rollback.json
# then update-distribution
```

The meta CSP in `index.html` remains as a safety net; it covers the
non-frame-ancestors directives even without the CloudFront policy.
