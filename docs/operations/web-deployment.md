# Web app deployment, rollback and $0 guardrails

Related: [#84](https://github.com/Thavarshan/honeymelon/issues/84),
[site deployment](site-deployment.md), [rollback runbook](rollback-runbook.md).
`apps/web` deploys as its own Cloudflare Workers Static Assets project, separate
from the marketing site, so the app's headers and service worker never affect
site pages.

## What runs where

| Check                                                  | When                                       |
| ------------------------------------------------------ | ------------------------------------------ |
| Unit tests, typecheck, lint, boundary checks           | Every PR (`verify.yml` quality job)        |
| `npm run build:browser` incl. `verify-dist.mjs`        | Every PR                                   |
| `scripts/ci/web-static-host.sh` (workerd, no account)  | Every PR                                   |
| `npm run test:web` (Chromium, Firefox, WebKit, mobile) | Every PR                                   |
| Deploy, live verification, live Chromium smoke         | Manual `Deploy web app` dispatch on `main` |

`verify-dist.mjs` fails the build if the output exceeds 20,000 files or any file
exceeds 25 MiB (free-plan limits), if JavaScript exceeds the 300 KiB gzip
budget, if source maps are present, if the service worker misses a file, or if
app code contains a network API.

PR checks need no Cloudflare credentials. Deploy jobs run only from `main`, need
an exact commit with green `required` and CodeQL checks (the site's reviewed
admission policy, reused), and use GitHub environments.

## One-time setup (owner)

1. In Cloudflare, nothing to create by hand: the first `wrangler deploy` creates
   the `honeymelon-web-preview` and `honeymelon-web` Workers on `workers.dev`.
   No KV, R2, D1 or other binding is used.
2. GitHub **environments** `web-preview` and `web-production`. Give each a
   `CLOUDFLARE_API_TOKEN` secret scoped to _Workers Scripts: Edit_ on this
   account only. Require reviewers on `web-production`.
3. Repository **variables**: `HONEYMELON_WEB_PREVIEW_URL` and
   `HONEYMELON_WEB_PRODUCTION_URL` (exact `https://` origins, different from
   each other), plus the existing `CLOUDFLARE_ACCOUNT_ID`.
4. After production verifies, the next site deploy picks up
   `HONEYMELON_WEB_PRODUCTION_URL`, which adds the **Web app (beta)** link and
   the browser privacy section to the site. Until then the site keeps saying the
   web app is not available.

Custom domains are optional and not configured. If one is added later, attach it
to the production Worker, update `HONEYMELON_WEB_PRODUCTION_URL`, and keep the
`workers.dev` URL working.

## Deploy

Actions → **Deploy web app** → `environment: preview`, `operation: deploy`. The
workflow builds, runs web unit tests, writes `deployment.json` (revision marker,
not precached), dry-runs Wrangler, uploads the artifact, publishes, verifies the
live host with `verify-deployment.mjs` (CSP, isolation headers, SPA routing,
`sw.js` freshness, immutable assets, revision, POST/PUT refused), then converts
real files on the live URL in Chromium with every off-origin or body-carrying
request blocked. Repeat with `production` after preview passes.

## Roll back

Actions → **Deploy web app** → `operation: rollback`, the environment, and a
version UUID from `npx wrangler versions list --env <environment>` (run in
`apps/web`). Verification then runs without a revision check; confirm
`/deployment.json` by hand.

Installed PWAs pick up the rolled-back version as a normal update: the cache
name is a content hash, so a rollback is a "new" version. Users see the update
prompt and choose when to reload.

## Monthly $0 audit

Run on the first working day of each month and record the result in the
deployment issue.

1. **Plan**: Cloudflare dashboard → Workers & Pages → Plans shows _Free_. No
   paid add-ons (Workers Paid, R2, Logpush, Images) are enabled.
2. **Requests**: both web Workers are assets-only (`run_worker_first = false`,
   no script), so asset requests are free and do not count against the 100,000
   requests/day dynamic quota. If the analytics show _Worker invocations_ for
   `honeymelon-web*`, stop and investigate: something added a script.
3. **Assets**: the latest `verify-dist.mjs` line in the deploy log shows file
   count (limit 20,000; currently about 20) and JS size; no file over 25 MiB.
4. **GitHub Actions**: the repo is public and uses standard hosted runners only.
   No larger runners or paid storage.
5. **Credentials**: tokens are environment-scoped; rotate yearly or on
   maintainer change.

Thresholds that require action before they become a bill: any dynamic Worker
invocation on the web projects, any binding added to `wrangler.toml`, more than
10,000 static files, or any single asset over 20 MiB. The project never enables
a paid tier automatically; if a free limit is reached, the right response is to
fail closed and open an issue.

## Repository settings that need the owner

These cannot be changed from a PR. Recommended:

- Branch protection on `main`: require the `required` and `CodeQL` checks and
  one approving review; disallow force pushes.
- Actions → General: workflow permissions _read_ by default (workflows already
  declare minimal `permissions`).
- Environments `site-production` and `web-production`: required reviewers.
