# Shared end-to-end tests

`@honeymelon/e2e` owns Playwright configuration, desktop launch/upload helpers,
reusable conversion page actions, native fixtures, browser harness tests, static
site tests, and conversion coverage. It is a test workspace; applications must
not depend on it at runtime.

## Run

From the repository root, using Node.js 24.22.0 (`.nvmrc`) and npm 12.2.0
(`package.json`):

```sh
npm ci
npm run binaries
npm run build
npm run test:matrix
npm run make
npm run dist:portable
npm run test:packaged
```

`npm run test:matrix` uses Turbo to build upstream workspace dependencies and
runs the native conversion project. It does not launch a browser.
`npm run test:e2e` runs the desktop project against the development build or
`HONEYMELON_EXECUTABLE`. `test:packaged` verifies native resources, copies the
packaged application outside the checkout, and runs the same desktop suite
against that copy. Create distributables with `make` first: the verification
receipt hashes those outputs. `dist:portable` adds the Linux tar archive and is
a no-op on other OSes.

Reports, traces, and failure screenshots live in `playwright-report/` and
`test-results/` within this workspace. Desktop and native projects have separate
artifact directories so they can run concurrently. CI uploads diagnostics even
when a test fails. The target-specific `native-matrix/matrix-*.json` report
classifies each requested pair and includes fixture provenance and input gaps.

## Conversion coverage

The matrix exercises every accepted source extension against each advertised
output within its media category. Video also exercises audio extraction and
frame saving. It generates small, real files using the staged native tools, uses
the production executor, probes each output, and decodes it with FFmpeg. It
checks source hashes and temporary-file cleanup. The desktop project clicks the
real format picker and converts a sample into every enabled output; it also
checks disabled formats, cancellation, settings, restart, and legacy migration.

A missing encoder is classified as unavailable. A missing audio track is an
expected rejection for audio extraction. A missing input fixture is explicitly
untested, never reported as a successful conversion. Failures are not retried or
hidden by capability filtering. A custom reporter aggregates across failed
worker restarts, preserving earlier results and unrun cases.

AMR, APE, and MPC inputs currently require external fixtures on the local macOS
ARM64 build. Supply actual small samples named `audio.amr`, `audio.ape`, and
`audio.mpc` in an absolute directory:

```sh
HONEYMELON_MEDIA_FIXTURES=/absolute/path/to/samples \
HONEYMELON_REQUIRE_INPUT_COVERAGE=1 npm run test:matrix
```

The strict flag fails if any accepted input lacks a fixture. External samples
are probed and decoded before use; a wrong extension alone does not provide
meaningful coverage. Validate sample provenance before committing fixtures.

This matrix verifies representative codecs/options, not every possible codec
inside each container, corrupted file, encryption scheme, or animation. Audio
and images are not turned into video or into each other; those would require new
product features. Platform results apply only to the tools tested on that
OS/architecture.

## Browser harness and static site

A real browser fixture mounts `@honeymelon/converter` over
`UnsupportedConversionService`. It tests unavailable capabilities, intake/UI
behavior, and request boundaries without encoding anything.

The web converter suite (`tests/web`, `npm run test:web`) drives the production
build of `apps/web` through `vite preview` in Chromium, Firefox, WebKit and a
Pixel 7 viewport. It converts real fixtures (PNG/JPEG images, MP3/FLAC/Ogg tones
and a VP9/Opus WebM generated with the staged FFmpeg), downloads and inspects
outputs, cancels and retries, runs axe in light and dark mode, completes a
keyboard-only workflow, starts offline, and applies a service worker update.
Every request that leaves the origin or carries a body fails the test. Set
`HONEYMELON_E2E_APP_URL` to run it against a deployed app.
`scripts/benchmark-web.mjs` records the
[capability matrix](../../docs/web/capability-matrix.md).

```sh
npm run build:packages
npm exec -w @honeymelon/e2e -- playwright install chromium firefox webkit
npm run test:browser
npm run test:site
```

Browser projects cover Chromium, Firefox, and WebKit locally; the small PR
harness runs Chromium. `test:site` builds the static marketing site through
Turbo and serves its exported HTML with Python 3 on port 4187 for Chromium
navigation, responsive layout, accessibility, motion, and download checks. The
browser fixture uses Vite preview on port 4173; `HONEYMELON_E2E_WEB_URL` can
point it at an existing host instead. External requests and non-GET/HEAD traffic
are rejected by the browser boundary tests.

`npm test -w @honeymelon/e2e` runs controlled native/core queue contract tests,
not Playwright or real browser encoding. `npm run typecheck -w @honeymelon/e2e`
checks both Node tooling and browser fixture configurations.
`npm run build -w @honeymelon/e2e` emits reusable helpers to `dist/`.

## Reusable helpers

Future hosts can import:

- `@honeymelon/e2e/config`: `createTestConfig(options, reportName)` supplies
  shared timeouts, traces, screenshots, and reports; pass the web app's
  `webServer`, `baseURL`, projects, and test directory as options.
- `@honeymelon/e2e/converter-page`: `ConverterPage` drives accessible tabs,
  format selection, file submission, Convert, and completion status. Its default
  uploader uses browser `setInputFiles`; desktop injects `selectDesktopFiles`
  because Electron needs real native file paths.
- `@honeymelon/e2e/media`: native seed generation and output verification, for
  use in the Node test process. Keep these imports out of browser/application
  code.

The page object currently uses English conversion control names. Web tests
should initialize that locale or adapt the actions to their localized labels. A
future web test must also verify the actual downloaded result from its real
conversion service; reaching a success label alone is not sufficient.

Browser harness and adapter contract commands are documented in
[adapter contract testing](../../docs/architecture/adapter-contract-testing.md).
