# Honeymelon Web threat model and release audit

Date: 28 October 2026. Scope: `apps/web`, `@honeymelon/browser-engine`, the
service worker and the static host configuration. Related:
[#83](https://github.com/Thavarshan/honeymelon/issues/83),
[ADR 0003](../architecture/0003-browser-media-engine.md). Re-run this review
when a dependency, codec path, header or host changes.

## Assets and trust boundaries

- **User media** (selected files, decoded pixels/PCM, outputs). Must never leave
  the tab or persist.
- **Preferences** (language, theme, output settings). Stored in localStorage by
  design; contain no file names or bytes.
- **App integrity** (HTML, JS, worker, service worker). Served from one static
  origin; cached by the service worker.

Untrusted input: every selected file, its name, and stored preferences. The
browser's media decoders are part of the browser's sandbox; Honeymelon's own
parsers read only bounded header bytes.

## Threats and controls

| Threat                                                | Control                                                                                                                                                                                  | Evidence                                                                                                     |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Media leaves the device                               | No upload code. CSP `connect-src 'self'`. Built JS is rejected if it contains `fetch(`, beacon, WebSocket, EventSource, XHR or `importScripts` outside `sw.js`                           | `verify-dist.mjs` + its test; E2E `guardNetwork` on every web test; engine unit test stubs every network API |
| Upload endpoint appears on the host                   | Assets-only Worker, no script, `run_worker_first = false`                                                                                                                                | `verify-deployment.mjs` requires POST/PUT `/` to fail; `web-static-host.sh` on workerd                       |
| Media persisted                                       | Outputs are in-memory Blobs; service worker serves only the precache list; preferences validated and contain settings only                                                               | PWA E2E inspects every Cache Storage entry; `preferences.test.ts`                                            |
| Renamed/malformed file reaches a decoder unexpectedly | Magic-byte sniffing must match the extension before any decode                                                                                                                           | `signatures.test.ts`, E2E "explains unsupported … inputs"                                                    |
| Decompression / memory bombs                          | Pixel count from headers checked **before** decode; duration checked **before** audio decode; per-media byte limits; retained-output budget; 5-minute worker deadline; one job at a time | `service.test.ts` (oversized, long track, budget, timeout, crash); E2E 64 MP refusal                         |
| Worker hang or crash                                  | Worker terminated on abort, timeout, `error` or `messageerror`; job fails with a clear message and the queue continues                                                                   | `service.test.ts` crash/timeout cases                                                                        |
| Animated input silently flattened                     | GIF frame count, APNG `acTL`, WebP `ANIM` flag and AVIF sequences are refused                                                                                                            | `signatures.test.ts`, `service.test.ts`                                                                      |
| Script injection via file names or metadata           | React escapes all text; names are never used as HTML or URLs; SVG input is not accepted                                                                                                  | Contract `inputExtensions` has no SVG                                                                        |
| XSS / third-party script                              | CSP `script-src 'self'`, no inline script in production, `object-src 'none'`, `base-uri 'none'`; no CDN or runtime third-party code                                                      | `verify-deployment.mjs` checks CSP; dev-only CSP relaxation in `vite.config.ts`                              |
| Clickjacking                                          | `frame-ancestors 'none'`, `X-Frame-Options: DENY`                                                                                                                                        | `verify-deployment.mjs`                                                                                      |
| Cross-origin leaks / window references                | `Cross-Origin-Opener-Policy` and `-Resource-Policy: same-origin`, `Referrer-Policy: no-referrer`                                                                                         | `verify-deployment.mjs`                                                                                      |
| Stale or poisoned offline cache                       | Cache name is a hash of every precached byte; old caches deleted on activation; updates activate only on user request                                                                    | PWA E2E update test; `verify-dist.mjs` precache completeness                                                 |
| Supply chain                                          | Exact-pinned dependencies (`save-exact`), lockfile, `npm audit --omit=dev --audit-level=high` in CI, CodeQL; one new runtime dependency (`fflate`, MIT, already in the lockfile)         | CI quality job                                                                                               |
| Abuse of hosting quota                                | Static assets only: no dynamic Worker invocations. See [cost guardrails](../operations/web-deployment.md#monthly-0-audit)                                                                | `wrangler.toml`                                                                                              |

Not mitigated, by design: a malicious browser extension or compromised device
can read the tab; the host sees request metadata (IP address, user agent).

## Licences of shipped code

Checked from installed package manifests on 28 October 2026. `apps/web` bundles
React, React DOM, radix-ui, cmdk, cn, tw-animate-css, i18next, react-i18next,
zod and fflate (MIT); lucide-react (ISC); class-variance-authority (Apache-2.0,
compatible; keep its notice with redistributed source); and the Inter font via
`@fontsource-variable/inter` (SIL OFL 1.1). No FFmpeg or GPL code ships in the
web app (ADR 0003).

## Accessibility record

Automated, on every web E2E run (Chromium, Firefox, WebKit):

- axe-core finds no serious or critical violations in light **and** dark mode.
  This audit found and fixed a real defect: inactive media tabs measured about
  4:1 contrast in dark mode, below WCAG AA's 4.5:1. The shared converter
  stylesheet now raises it, which also fixes desktop.
- A keyboard-only workflow (shortcut to open files, Tab to Convert, Enter)
  completes a conversion.
- At a 360 px-wide mobile viewport (Pixel 7 emulation) nothing scrolls
  horizontally and the converter works.
- Reduced motion is honoured by the shared converter styles
  (`prefers-reduced-motion` disables spinners and transitions).

Manual, **pending** (not done by this change):

- Screen readers: VoiceOver (macOS and iOS), NVDA (Windows), TalkBack.
- 200% zoom and Windows high-contrast mode.
- Real iOS Safari and Android Chrome: file picking, downloads, backgrounding
  during a conversion, and PWA install.

## Release audit status

| Area                                | Status                                                              |
| ----------------------------------- | ------------------------------------------------------------------- |
| Headers, CSP, isolation             | Automated (local workerd in CI; live after each deploy)             |
| No upload path / no media requests  | Automated (build scan, unit, E2E, live POST check)                  |
| Dependency licences                 | Reviewed above                                                      |
| High-severity dependency advisories | CI gate (`npm audit --omit=dev --audit-level=high`)                 |
| Cross-browser                       | Chromium and Firefox here; WebKit in CI; Safari/Edge/phones pending |
| Accessibility                       | Automated passing; manual screen-reader review pending              |
| Resource failure states             | Unit tested; real low-memory devices pending                        |
