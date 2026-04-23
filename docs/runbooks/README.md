# Runbooks

Procedural guides for operations that don't happen often enough to automate
but are critical to get right. Each runbook is self-contained and
human-executable.

| Runbook | When to use |
|---|---|
| [secret-rotation.md](./secret-rotation.md) | Rotate JWT, Stripe, Netopia, SMTP, or AWS credentials — either on a schedule or after a suspected leak. |
| [git-history-cleanup.md](./git-history-cleanup.md) | Remove secrets or other sensitive data that were committed to git and pushed. Always rotate first; history rewrite is secondary. |

## Conventions

- Every runbook assumes you are operating from a trusted workstation with
  MFA-enabled AWS credentials.
- Commands use `bash` syntax. PowerShell equivalents are noted where the
  difference matters (history disabling, file shredding).
- If a step uses an AWS CLI command, the default region is `eu-central-1`
  unless otherwise specified.
- The "rotation log" (`rotation-log.md`, created on first use) is an
  append-only record of every secret rotation and history cleanup. It is
  the paper trail for security audits.
