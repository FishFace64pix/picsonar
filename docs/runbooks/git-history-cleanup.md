# Git History Cleanup Runbook

Use this runbook when secrets, credentials, or other sensitive data have been
**committed to git history** (not just the current tree). Simply deleting
the file in a new commit does **not** remove it — every clone and the remote
still have the leaked bytes in their object database.

> **Rewriting published history is destructive.** Every collaborator must
> re-clone, every open PR is broken, and downstream forks keep the leak
> unless you contact GitHub support. Only do this after you've rotated the
> leaked secret (see `secret-rotation.md`). Rotation is the primary mitigation;
> history cleanup is just hygiene.

---

## 0. Decide whether to clean history at all

If a secret was committed and pushed:

1. **Rotate immediately** (that's the real fix — assume it's already in
   crawlers and scraped datasets).
2. **Then** decide if the history rewrite is worth the cost.

Rewrite is worth doing when:
- The leaked material is non-rotatable (personal data, internal docs, a PEM
  from a third party that won't re-issue).
- Repo is private, has ≤5 collaborators, and you can coordinate a re-clone.

Skip the rewrite when:
- Repo is public and has forks — the leak persists in forks anyway.
- The secret is cheap to rotate and rotation is already done.

---

## 1. Inventory: what actually leaked?

```bash
# Scan every commit for the usual secret patterns.
docker run --rm -v "$(pwd)":/repo zricethezav/gitleaks:latest detect \
  --source /repo --no-git --verbose --redact

# Including deleted commits / stashes / branches:
docker run --rm -v "$(pwd)":/repo zricethezav/gitleaks:latest detect \
  --source /repo --log-opts="--all" --verbose --redact
```

Alternative if you can't use Docker:
```bash
# Install via homebrew/scoop/apt and run the same scan.
gitleaks detect --source . --no-git --verbose --redact
gitleaks detect --source . --log-opts="--all" --verbose --redact
```

Capture the output. For each finding, note:
- file path
- first commit that introduced it (`git log -S '<known-token-prefix>' --all --oneline`)
- whether the secret still exists in the working tree

---

## 2. Rotate first, then rewrite

Follow `docs/runbooks/secret-rotation.md` for every finding **before**
touching history. If you rewrite first and the rotation fails, you now have
extra work and the leaked secret is still valid on third-party services.

---

## 3. Back up the repo

```bash
# A bare clone is the safest off-site backup — everything, no working tree.
git clone --mirror git@github.com:<org>/<repo>.git ../picsonar-backup.git
# Also tag the current main for safety:
git tag -a pre-cleanup-$(date +%Y%m%d) -m "Snapshot before history rewrite"
git push origin pre-cleanup-$(date +%Y%m%d)
```

Keep the bare clone until you've confirmed the rewrite is healthy.

---

## 4. Coordinate with collaborators

Post in the team chat:
> "Rewriting git history on `main` today at HH:MM UTC. Please push any open
> work before then. After the rewrite, delete your local clone and
> `git clone` fresh — no `git pull` or rebase. Open PRs will need to be
> recreated from a fresh branch."

Wait for acks. Close or merge any PRs you don't want to lose.

---

## 5. Remove the leaked content

Use **`git-filter-repo`** (much faster and safer than the deprecated
`git filter-branch`). Install:
```bash
pip install git-filter-repo --break-system-packages   # or: brew install git-filter-repo
```

### By file path
```bash
# Fresh mirror clone (filter-repo refuses to run on a non-fresh clone).
git clone git@github.com:<org>/<repo>.git picsonar-rewrite
cd picsonar-rewrite

git filter-repo --invert-paths \
  --path .env \
  --path .env.production \
  --path infra/netopia_private.pem \
  --path backend/.env.local
```

### By string content (when the secret was inline in source)
```bash
# Put each known leaked string on its own line, then:
cat > /tmp/replacements.txt <<'EOF'
<YOUR_STRIPE_SECRET_KEY>==>REMOVED_STRIPE_KEY
<YOUR_WEBHOOK_SECRET>==>REMOVED_WEBHOOK_SECRET
<YOUR_SENDGRID_KEY>==>REMOVED_SENDGRID_KEY
EOF

git filter-repo --replace-text /tmp/replacements.txt
```

Verify:
```bash
git log --all -p | grep -E 'sk_live|whsec|BEGIN RSA PRIVATE' || echo "clean"
```

---

## 6. Force-push to the remote

```bash
# Re-add origin (filter-repo removes it as a safety measure).
git remote add origin git@github.com:<org>/<repo>.git

# Push every branch + every tag, overwriting the remote.
git push --force --all
git push --force --tags
```

---

## 7. Invalidate caches / forks / GitHub's object store

GitHub keeps rewritten objects reachable via the REST API and cached search
indexes for some time. To purge:

1. **Open a GitHub support request**: https://support.github.com/contact →
   "I need to remove sensitive data from my repository." Include the SHAs
   of the old commits and confirmation that the secret has been rotated.
   GitHub staff will flush internal caches and expire the old commit SHAs
   from `https://github.com/<org>/<repo>/commit/<sha>` URLs.
2. **Disable forks** if you have network permissions to do so, or contact
   support to disable existing forks temporarily.
3. **Clear PR cache**: any open PR branch must be force-pushed or recreated.

---

## 8. Every collaborator re-clones

Send this to the team:
```
rm -rf <repo>
git clone git@github.com:<org>/<repo>.git
```

A `git pull` after a history rewrite creates a merge commit that resurrects
the leaked data. **Re-clone is not optional.**

---

## 9. Add prevention

After the fire's out, commit these to prevent recurrence:

1. **`.gitignore`** — add every `.env*` pattern:
   ```
   .env
   .env.*
   !.env.example
   *.pem
   *.key
   *.p12
   ```

2. **Pre-commit hook** — install `gitleaks` as a hook:
   ```bash
   pip install pre-commit --break-system-packages
   ```
   Create `.pre-commit-config.yaml`:
   ```yaml
   repos:
     - repo: https://github.com/gitleaks/gitleaks
       rev: v8.21.2
       hooks:
         - id: gitleaks
   ```
   Then: `pre-commit install`

3. **CI secret scan** — the `codeql.yml` workflow already covers some
   patterns; add a dedicated gitleaks job if you want defense-in-depth:
   ```yaml
   - uses: gitleaks/gitleaks-action@v2
     env:
       GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
   ```

4. **Enable GitHub secret scanning** in repo settings → Security →
   "Secret scanning" and "Push protection." Push protection blocks the
   commit at the server when it sees a known key pattern — the fastest
   possible feedback loop.

---

## 10. Close out

- Document the incident in `docs/runbooks/rotation-log.md`: which secret,
  when it was leaked, when rotated, when history was cleaned.
- If the leak included customer PII, assess GDPR notification obligations
  (Romania: notify ANSPDCP within 72 hours for high-risk breaches).
- Delete the backup mirror once you're confident the rewrite is stable.
