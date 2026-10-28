# @honeymelon/desktop

The Electron desktop application for local video, audio, and image conversion.
Its package version is `3.0.0-beta.2`. Only the published `3.0.0-beta.1` was
permitted to ship unsigned; release policy requires macOS and Windows signatures
for every other version. Identity and migration acceptance is tracked in the
[desktop identity test matrix](../../docs/releases/desktop-identity-test-matrix.md).

## Responsibilities and integration

- `src/main/`: application lifecycle, native dialogs, preferences, resource
  discovery, validated IPC, and the authoritative native conversion engine.
- `src/preload/`: the narrow typed bridge exposed to the renderer.
- `src/renderer/`: desktop shell, title bar, settings, localization, and the
  `ConverterPlatform` transport adapter used by `@honeymelon/converter`.
- `forge.config.ts` and `vite.*.config.ts`: packaging, runtime bundling,
  renderer assets, binary staging, and platform makers.

The renderer uses shared converter features and `@honeymelon/ui`, with contracts
and core types. Native execution belongs to `@honeymelon/engine` in the main
process; renderer code must not import Node modules, Electron, or the native
engine. Hosts own service lifetime; a React unmount must not terminate active
jobs.

Preferences persist across launches. Queue state does not: restarting the app
starts an empty queue. Submitted batches retain their settings, cancellation
waits for cleanup, and output publication preserves sources and existing files.
Capabilities depend on the native tools available for the target platform.

## Development and checks

Run commands from the repository root with Node.js 24.22.0 and npm 12.2.0.
Install once with `npm ci`; run `npm run build:packages` before invoking
workspace checks directly so dependency exports exist. Root `npm run typecheck`
and `npm test` use Turbo to build upstream packages automatically.

```sh
npm run dev -w @honeymelon/desktop
npm run build
npm test -w @honeymelon/desktop
npm run typecheck -w @honeymelon/desktop
npm run binaries
npm run test:integration
npm run test:e2e
```

The development command starts Electron Forge. Native tools are pinned and
checksum-verified; development staging may download them, while packaged apps
include them. The build emits `.vite/build/` main, preload, and image-worker
bundles plus `.vite/renderer/main_window/`.

## Packaging

From the repository root, run `npm run make`, then `npm run dist:portable` on
Linux and `npm run test:packaged`. Outputs live under `apps/desktop/out/`.
`npm run package` creates an application bundle without all distributables.
Packaging targets the host OS/architecture; Linux makers require `rpm` and
`fakeroot`, and headless desktop tests need Xvfb and Electron runtime libraries.

The release matrix covers macOS/Windows/Linux on x64 and ARM64. macOS produces
ZIP, Windows Squirrel/ZIP, and Linux DEB/RPM/portable tar. Native packaged
checks are required per target; a local build does not validate other platforms.
See the [root build/release guide](../../README.md#builds-and-releases) and
[E2E guide](../../packages/e2e/README.md).
