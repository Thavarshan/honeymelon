# Adapter and browser test contracts

Run `npm test -w @honeymelon/e2e` for the shared service suite. The same
observable contracts run against `NativeConversionService` over its existing
engine and the browser-safe `QueueConversionService`. Both use controlled
executors: these tests prove scheduling, immutable admission, snapshots,
progress, FIFO, single-slot execution, collision naming in the fixture, failure
advancement, abort cleanup, repeated cancellation, disposal and independent
unsubscribe. They do not claim that a mock encoded real media. Native
integration tests and packaged platform tests retain actual output, collision
and source-preservation coverage. A real browser encoder must join these
contracts before browser conversion is considered implemented.

`QueueConversionService` uses the existing core lifecycle reducer and owns no
files, workers, Node modules or output bytes. Its executor supplies capability
discovery, admission validation, probing, execution, and idempotent cleanup. One
slot covers execution and draft inspection. Submitted jobs take priority over
queued inspections. Executors must settle after abort/resource termination;
adapters enforce their own deadlines. Cleanup failure is a failed job and a
rejected cancellation, never a falsely successful cancellation.

## Browser harness

The fixture mounts the real shared converter over
`UnsupportedConversionService`. It needs no Cloudflare credentials, account,
server conversion API, or Electron bridge. Generated PNG/JPEG files are checked
in under `packages/e2e/fixtures/images`; no private sample media is used.

```sh
npm run build:packages
npm exec -w @honeymelon/e2e -- playwright install chromium firefox webkit
npm run test:browser -w @honeymelon/e2e
```

The script builds the fixture and launches a local static Vite preview. A
dedicated config prevents Vitest from collecting Playwright specs. Browser
projects reuse the common trace, screenshot, and report settings. The browser
suite rejects external requests and all methods except GET/HEAD while local
files are selected. The optional `HONEYMELON_E2E_WEB_URL` can point these tests
at an existing browser fixture host.

The product web app has its own suite (`npm run test:web`, see the
[e2e README](../../packages/e2e/README.md)) that converts and inspects real
files. `@honeymelon/browser-engine` unit tests drive the real service through a
scripted worker and media runtime: capability probing, settings, renamed,
animated and oversized inputs, cancellation, crash, timeout, memory budget,
audio, video frames and a no-network guard.

Import UI and converter styles into one host CSS entry so Tailwind processes
both source declarations; importing separate styles directly from JavaScript can
leave a standalone `@source` directive unprocessed.

PR quality CI installs Chromium, Firefox and WebKit and runs the converter
harness, static site tests and the web suite; browser diagnostics are retained
for seven days. Desktop CI covers six native build targets and the Linux distro
compatibility job. PRs skip only the exhaustive native conversion-pair matrix;
non-PR exhaustive verification retains it.
