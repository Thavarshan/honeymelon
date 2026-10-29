# @honeymelon/web

Honeymelon Web: the shared converter UI running entirely in the browser over
`@honeymelon/browser-engine`. React + Vite, built to static files for Cloudflare
Workers Static Assets. No server code, account, upload or analytics.

User-facing limits and privacy: [docs/web](../../docs/web/README.md). Design
decision: [ADR 0003](../../docs/architecture/0003-browser-media-engine.md).

## Structure

- `src/platform.ts`: the `ConverterPlatform` host. Creates the engine with a
  bundled worker (`@honeymelon/browser-engine/worker?worker`) and device-aware
  limits, downloads single outputs, and zips **Download all** (stored,
  uncompressed) with `fflate`.
- `src/App.tsx`: header, update prompt, footer, theme and language. Settings
  persist in localStorage (`preferences.ts`, validated field by field); files
  never do.
- `src/WebToolbar.tsx`: **Download all**, the memory readout, and a
  `beforeunload` guard while jobs run or outputs are not yet downloaded.
- `src/pwa.ts` + `sw/service-worker.js`: the build emits `/sw.js` with a
  content-hashed version and an explicit precache of every built file. Updates
  wait for the user's **Reload**.
- `public/_headers`: CSP and isolation headers for the static host. The same CSP
  is in `index.html` so local previews enforce it.
- `scripts/verify-dist.mjs`: build gate for host limits, the JS budget, the
  precache and forbidden network APIs.
- `scripts/{deployment-policy,prepare-deployment,verify-deployment}.mjs`:
  deployment admission (reused from the site), revision marker, live checks.

## Commands

From the repository root (Node.js 24.22.0, npm 12.2.0):

```sh
npm run build:packages
npm run dev -w @honeymelon/web          # http://127.0.0.1:5173
npm run build -w @honeymelon/web        # dist/ + verify-dist
npm test -w @honeymelon/web             # vitest + script tests
npm run test:web                        # Playwright, all engines
bash scripts/ci/web-static-host.sh      # workerd host contract
node packages/e2e/scripts/benchmark-web.mjs --engines chromium
npm run icons -w @honeymelon/web        # regenerate PWA icons from assets/logo.svg
```

The service worker registers only in production builds. To test PWA behaviour
locally, run
`npm run build -w @honeymelon/web && npm run preview -w @honeymelon/web` (port
4174).

Deployment:
[docs/operations/web-deployment.md](../../docs/operations/web-deployment.md).
