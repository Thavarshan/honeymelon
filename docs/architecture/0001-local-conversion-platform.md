# ADR 0001: local conversion across desktop and browser

Date: 18 October 2026. Status: accepted architecture; browser shipping gates
below remain unfulfilled until the corresponding implementation is tested.

Related: [#63](https://github.com/Thavarshan/honeymelon/issues/63),
[#61](https://github.com/Thavarshan/honeymelon/issues/61).

## Current implementation status (2026-10-28)

This ADR records the original direction; its roadmap references below are
historical planning context, not open-work assertions. The shared contracts,
core lifecycle/service layer, native engine adapter, converter workspace, static
marketing/download site, release snapshot pipeline, boundary checks, and browser
harness have since been implemented. `apps/web` (Honeymelon Web beta) now runs
the shared converter over a working `@honeymelon/browser-engine`: images, audio
to WAV, and video frame/audio extraction, with workers, limits, cancellation,
PWA and deploy tooling. Audio/video uses native browser decoders rather than
FFmpeg WebAssembly; see [ADR 0003](0003-browser-media-engine.md). See
[docs index](../README.md) for current operational guides and acceptance
records.

## Decision and scope

The owner approved Honeymelon on 20 October 2026. See ADR 0002 for the identity
transition (#86–96), which supersedes the original identity retention decision.
The owner approved image-first browser delivery, maintained technical docs, and
focused PRs with evidence-based closure on 18 October 2026.

Use npm workspaces and Turborepo for these responsibilities:

| Workspace                 | Responsibility                            | Runtime boundary                        |
| ------------------------- | ----------------------------------------- | --------------------------------------- |
| `apps/desktop`            | Native shell, dialogs, IPC, preferences   | Electron/Node in main; browser renderer |
| `apps/site`               | Marketing, downloads, documentation       | Next.js static export                   |
| `apps/web`                | Local browser converter                   | React/Vite; no server conversion        |
| `packages/contracts`      | Serializable schemas and errors           | Browser-safe; native DTOs kept distinct |
| `packages/core`           | Queue transitions and conversion domain   | No platform I/O or UI framework         |
| `packages/converter`      | Shared React conversion workflow          | Injected platform services              |
| `packages/engine`         | FFmpeg/FFprobe, filesystem, image workers | Node only                               |
| `packages/browser-engine` | File/Blob, browser codecs and workers     | Browser only                            |
| `packages/ui`             | Shared shadcn primitives and tokens       | Browser-safe React                      |
| `packages/e2e`            | Shared workflow and adapter verification  | Test-only platform drivers              |

Site, web, core, converter, and browser-engine are target workspaces, not
existing products. The desktop release tag stays immutable while these are
introduced.

The converter consumes a conversion-service port. It must not call
`window.honeymelon`, read a native absolute path, or import engine
implementation. Desktop maps opaque input IDs to native paths; web maps them to
selected File/Blob objects. Neither path strings nor browser File objects belong
in portable queue snapshots. Keep native bridge DTOs separate rather than
weakening their path validation.

Extract existing scheduler behavior without introducing a second scheduler in
React: FIFO batches, one active job by default, submitted settings immutable,
failure advancement, and cancellation terminal only after cleanup. Native
scheduling remains authoritative during the extraction; adapt it incrementally.
Use revisioned snapshots and focused state updates rather than rebuilding every
job on each progress event.

## Why these applications

The site needs indexable pages and build-time release metadata. Choose Next.js
`output: 'export'`; serve its `out/` directory as static assets. Avoid SSR,
middleware, cookies, server actions, runtime image optimization, and
visitor-time GitHub API calls. Next.js server features and redirects/headers are
not available in static export; configure HTTP policy in the static host
instead.
[Next.js export reference](https://nextjs.org/docs/app/guides/static-exports).

The converter is a local application, so use React/Vite without a server
runtime. Keep the existing shadcn theme and five interface languages. Desktop
keeps its compact native shell; browser layout may adapt for touch and smaller
screens. Sharing workflows does not require identical window chrome.

## Browser capability policy

Decode and encode support are separate. Probe real output MIME and magic bytes:
canvas can silently fall back to PNG. Re-decode outputs and verify dimensions.
Do not expose an encoder merely because an input decoder exists.
[Canvas serialization standard](https://html.spec.whatwg.org/multipage/canvas.html#serialisation-of-bitmaps).

| Media                             | Desktop baseline                     | Browser candidate                                  | Shipping gate                                                                                         |
| --------------------------------- | ------------------------------------ | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Still images                      | Existing native capability catalogue | JPEG/PNG; WebP only when the actual encoder passes | Decode, output MIME/signature/dimensions, EXIF orientation, alpha/background, quality and abort tests |
| AVIF images                       | Tool-specific capability             | Probe only; no initial promise                     | Correct encoder output and round-trip fixtures per supported browser                                  |
| GIF/HEIC/TIFF/SVG/animated images | Existing native support varies       | Outside image MVP                                  | Explicit handling or rejection; never silently flatten animation or execute untrusted SVG             |
| Audio                             | Native FFmpeg capabilities           | Candidate MP3/WAV/FLAC/Opus/AAC subset             | #78 pinned WASM/codec/license/delivery evidence, then #79 real playback/probe and cleanup tests       |
| Video/audio extraction            | Native capabilities                  | Short, bounded MP4/WebM candidates                 | #78–81 measurements, worker cancellation, resource limits and valid outputs                           |

Do not equate browser media playback support with encoding support. Native tests
do not establish WASM parity. Retain desktop as the explicit option for large or
unsupported operations; no remote conversion fallback.

| Environment                    | Evidence required before advertising support                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Desktop Chromium/Edge          | Automated Chromium fixtures plus a branded Edge smoke test                                                        |
| Desktop Firefox                | Firefox fixtures including unsupported MIME fallback                                                              |
| Desktop Safari                 | WebKit automation plus real Safari manual smoke; WebKit is not Safari certification                               |
| iOS Safari / Android Chrome    | Real-device orientation, file selection/export, memory and backgrounding tests; emulated viewport is insufficient |
| Older/resource-limited devices | Feature detection and a useful unsupported/resource error; no universal maximum claim                             |

The reproducible P0 probe is
`packages/e2e/scripts/probe-image-capabilities.mjs`. Install the pinned
Playwright browsers with
`npm exec -w @honeymelon/e2e -- playwright install chromium firefox webkit`,
then run `node packages/e2e/scripts/probe-image-capabilities.mjs`. The probe
uses generated pixels, blocks page network requests, verifies MIME/decoded
dimensions, and records engine versions. It measures tiny still images only, not
an end-to-end converter, mobile support, EXIF behavior, cancellation, or safe
memory limits.

### Measured still-image spike

[Raw results](../compatibility/browser-image-probe.json), measured on macOS
ARM64 with the repository's Playwright 1.64.1 on 18 October 2026. Every returned
blob passed its MIME-specific signature check and decoded to 8 × 8 pixels. A
fallback counts as unavailable for the requested format, even when the fallback
is valid.

| Engine                | PNG     | JPEG    | WebP         | AVIF         |
| --------------------- | ------- | ------- | ------------ | ------------ |
| Chromium 156.0.8078.4 | encoded | encoded | encoded      | PNG fallback |
| Firefox 157.0         | encoded | encoded | encoded      | PNG fallback |
| WebKit 27.2           | encoded | encoded | PNG fallback | encoded      |

All three exposed OffscreenCanvas; that does not prove worker-side image
workflow correctness. These non-isolated pages did not establish multithreaded
WASM availability. No WASM codec or resource benchmark is claimed by this spike.

## Memory, workers, and cancellation

Use a worker per active image job initially, with concurrency one. Estimate
decoded pixel buffers from width × height × bytes per pixel plus intermediates;
compressed input size alone is insufficient. Bound pixels, input bytes, retained
outputs, and queue length conservatively. Select measured product limits in
#74–76 rather than presenting a browser's theoretical address space as a safe
file limit.

Feature-detect worker-side canvas and image decoding. If unavailable, either
provide a separately bounded, tested fallback or disable the operation clearly.
Terminate workers for hard cancellation; ignore stale job events and release
ImageBitmap, object URLs, buffers, and temporary virtual files before terminal
state. Reload discards runtime jobs; do not replay conversions automatically.

For WASM, benchmark single-thread first; multithreading requires usable shared
memory and cross-origin isolation with compatible COOP/COEP/CORP headers. Verify
`crossOriginIsolated` at runtime. Serve site and app separately so app isolation
does not unexpectedly constrain marketing pages. Implement explicit
single-thread fallback only after testing it. The wrapper's license does not
cover every core codec/library; record exact build flags, notices,
corresponding-source obligations and distribution review before shipping a core.
[WASM architecture](https://ffmpegwasm.netlify.app/docs/overview/),
[license and limitations](https://ffmpegwasm.netlify.app/docs/faq/).

## Hosting and cost envelope

Source checks: 18 October 2026. These are service limits, not a capacity or cost
guarantee. Recheck before deployment; no paid plan, new billing integration, or
automatic upgrade is authorized.

| Service                        | Current sourced allowance/constraint                                                 | Honeymelon policy                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Workers Static Assets          | Static requests/storage have no extra charge                                         | Assets-only site/app; no `run_worker_first` or conversion handler                |
| Free Static Assets             | 20,000 files/version; 25 MiB/file                                                    | Build fails above either limit; check each uncompressed deployed asset           |
| Workers Free dynamic execution | 100,000 requests/day; 10 ms CPU/invocation                                           | Do not depend on dynamic requests for conversion or normal page delivery         |
| GitHub Actions                 | Standard hosted runners free for public repos; larger runners charged                | Standard runners only; short-lived diagnostics and review artifact storage usage |
| R2 Standard, optional only     | 10 GB-month storage, 1M class A and 10M class B operations/month; excess is billable | Not enabled for MVP; existing credentials are not approval to add usage          |

Sources:
[Static Assets billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/),
[Workers limits](https://developers.cloudflare.com/workers/platform/limits/),
[Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions),
[R2 pricing](https://developers.cloudflare.com/r2/pricing/).

Prefer GitHub Actions builds and direct static deployments; Cloudflare Builds
minutes are not part of this initial design. Preview and production use distinct
projects with narrowly scoped secrets. Deploy initially to free `workers.dev`
origins; custom domain ownership, legacy-site integration and DNS changes remain
future deployment inputs, not assumed approval.

### WASM larger than 25 MiB

The [asset inspection](../compatibility/ffmpeg-wasm-asset-probe.json) verified
the npm tarball integrity for `@ffmpeg/core@0.12.10`. Its ESM and UMD WASM files
are each 32,232,419 bytes, exceeding 26,214,400 bytes (25 MiB). The compressed
package size does not make the deployed WASM file eligible. Reproduce with
`npm pack @ffmpeg/core@0.12.10 --ignore-scripts` in a temporary directory,
inspect the archive members without executing package code, and compare the
recorded SHA-256 hashes. No media processing or codec/license clearance is
implied by asset inspection.

Image MVP needs no FFmpeg download. In #78 measure exact core files before
choosing AV delivery. First evaluate a smaller, reproducibly built codec subset
hosted as first-party static assets. A pinned third-party asset host is
conditional on availability, redistribution rights, CORS/CORP, size, and SHA-256
verification before instantiation. Do not execute downloaded third-party loader
scripts.

R2 is not a guaranteed zero-cost alternative: quotas include operations and are
not enforced by an alert alone. No R2 deployment without an approved fail-closed
quota strategy. Do not enable audio/video if neither first-party assets nor an
approved integrity-checked host meets the budget and privacy policy. Chunked
cores would add reassembly memory, caching, and integrity costs; they need their
own measurement and are not an assumed workaround.

## Privacy and go/no-go gates

All selected source media stays on the device. No accounts, analytics by
default, server conversion, media-bearing network requests, or persistent media
cache. Hosting and optional asset downloads still expose ordinary request
metadata such as IP addresses to hosts; do not claim that the application makes
no requests or offers anonymity. Preferences may persist separately from
source/output bytes.

1. #64: forbidden imports fail CI; clean workspace builds remain reproducible.
2. #65–68: one portable domain/service contract and shared UI; desktop
   regression checks stay green. Keep Node in the native adapter, not browser
   bundles.
3. #74–77: real images, worker cleanup, responsive UI, browser fixtures, network
   assertions, accessible controls, and output validation before image preview.
4. #78–81: measured WASM size, memory, codecs, licensing, asset integrity and
   desktop/mobile browser behavior before enabling audio/video.
5. #82–85: tested offline/update behavior, privacy/accessibility/security
   evidence, verified downloads and rollback before public launch. Unsupported
   or untested features stay unavailable; gate failures cannot trigger paid or
   remote fallback.

Record actual versions, fixtures, limitations and pass/fail evidence with each
implementation PR. Manual device or legal/distribution checks that cannot be
verified remain open; issue closure is not a substitute for that evidence.
