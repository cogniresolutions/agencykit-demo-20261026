# CLAUDE.md: set up AgencyKit

You are setting up AgencyKit, a self-hosted agency platform (Next.js 16 + PostgreSQL 16, run with Docker Compose). Follow these steps in order. Show the user each command's result briefly. Do not skip the security gate.

## 1. Check prerequisites

Run each check and report the versions:

```bash
docker --version
docker compose version        # Compose v2 is required
node --version                # 22 or newer (used for scans and tests)
openssl version
git --version
```

If Docker or Compose is missing or the Docker daemon is not running, stop and tell the user how to install or start it. If Node is older than 22, tell the user to upgrade.

## 2. Security gate (run BEFORE installing anything)

Run every scanner that is available. If a scanner is not installed, tell the user and offer the install command, but continue with the others.

```bash
gitleaks git . --redact                                   # secrets in git history
osv-scanner scan source --lockfile package-lock.json      # known vulnerable dependencies
semgrep scan --config p/javascript --config p/typescript --config p/secrets --config p/nextjs --severity ERROR .
npm audit --omit=dev --audit-level=high                   # production dependencies
```

**STOP if any scanner reports a HIGH or CRITICAL finding** (for semgrep: any ERROR-severity result; for gitleaks: any leak). Summarize the findings and ask the user how to proceed. Do not run setup, do not start containers.

If everything is clean, print a short table: scanner, findings by severity, status.

## 3. Generate secrets

```bash
./scripts/setup.sh
```

This writes `.env` with random database passwords and `AUTH_SECRET` (mode 600). It never overwrites an existing `.env`. Never print the contents of `.env`.

Optional: if the user wants Claude-written websites and AI chat answers, ask for their Anthropic API key and set `ANTHROPIC_API_KEY=` in `.env` (without echoing it back). Without a key, built-in templates and a polite hand-off reply are used.

## 4. Build and start

```bash
docker compose up -d --build
```

## 5. Wait until healthy

Poll for up to 180 seconds:

```bash
for i in $(seq 1 90); do
  curl -fsS http://localhost:3000/api/health && break
  sleep 2
done
docker compose ps
```

If it never becomes healthy, show `docker compose logs app --tail 80` and diagnose.

## 6. Scan the built image

```bash
trivy image --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 agencykit:local
```

If trivy is not installed you can run it with Docker:

```bash
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:0.76.1 image --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 agencykit:local
```

**STOP and report if HIGH or CRITICAL vulnerabilities are found** (run `docker compose down` and ask the user how to proceed).

## 7. Verify tenant isolation (optional, needs Node 22)

```bash
npm ci --no-fund
npm run test:isolation
```

All checks must pass. This test cleans up after itself.

## 8. Open the app

```bash
open http://localhost:3000 2>/dev/null || xdg-open http://localhost:3000 2>/dev/null || echo "Open http://localhost:3000"
```

Get the demo login, which was printed once on first start:

```bash
docker compose logs app | grep -A3 "demo login"
```

## 9. Print the next steps

Tell the user:

1. Sign in at http://localhost:3000 with the demo login above (or create an agency at `/signup` if `SEED_DEMO=false`).
2. Click **Create sub-account** and pick an industry and brand color.
3. Open **Websites → Generate website**, walk through the wizard and publish. The site is live at `/s/<slug>` with a contact form and AI chat widget.
4. Submit the contact form on the live site and watch the lead appear in **Contacts**, **Conversations** and the **Dashboard**.
5. Optional sample data: `docker compose exec app node scripts/seed-sample.mjs --sub <sub-account-slug>`.
6. Review **Security check** in the sidebar.
7. For production, put a TLS reverse proxy in front and set `APP_URL` to the https URL.

## Project facts for later tasks

- Data access must go through `withTenant()` / `withTenantSlug()` in `src/lib/tenant.ts`. Never query tenant tables with the bare `db` client.
- New tenant tables need a `sub_account_id` column plus an RLS policy in a new migration under `drizzle/`.
- Validate every input with zod. Keep secrets out of client components.
- Useful commands: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:isolation`, `npm run test:smoke`.
