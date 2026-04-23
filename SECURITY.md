# Security Policy

## Reporting a Vulnerability

If you discover a security issue in PicSonar, please email
**security@picsonar.com** with:

- A description of the issue and its impact
- Steps to reproduce (minimal PoC where possible)
- Your name / handle if you'd like public credit

We aim to acknowledge every report within **two business days** and to
provide an initial assessment within **five business days**. Please do not
publicly disclose the issue until we've had a reasonable chance to fix it —
normally 90 days, shorter if the issue is actively being exploited.

We do not currently offer a paid bug-bounty programme, but we will credit
reporters in release notes (opt-in) for any valid, previously unreported
issue.

## Scope

In scope:

- picsonar.com / picsonar.ro production domains and their subdomains
- The AWS-deployed API at api.picsonar.com
- The Claude-Desktop-distributed marketplace bundle (if applicable)

Out of scope:

- Denial-of-service attacks
- Social engineering of PicSonar staff
- Reports from automated scanners that we can reproduce ourselves in
  under five minutes (rate limiting, TLS version, CSP strictness etc.
  are intentional trade-offs documented in `docs/security/`)
- Vulnerabilities in third-party dependencies that do not have a viable
  exploit path through our application

## Supported Versions

Only the current `main` branch receives security updates. Forks or
self-hosted instances are unsupported.

## Safe Harbor

We will not pursue legal action against researchers who:

- Act in good faith and make a reasonable effort to avoid privacy
  violations, data destruction, and service disruption
- Only interact with accounts they own or have explicit permission from
  the account holder to access
- Give us reasonable time to investigate and fix an issue before any
  public disclosure
