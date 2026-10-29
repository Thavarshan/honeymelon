# Honeymelon changelog

Honeymelon continues the Comet project. Historical release notes below retain
the names and versions under which they were published.

# Release Notes

## Unreleased

### Added

- Honeymelon Web (beta), `apps/web`: the shared converter running entirely in
  the browser. Images to JPEG/PNG (WebP/AVIF where the browser encodes them),
  audio and video audio tracks to WAV, and still frames from video, with
  per-job workers, resource limits, cancellation, Download all (ZIP), five
  languages, light/dark themes, offline use and an opt-in update prompt. No
  uploads, accounts or analytics. See `docs/web/README.md`.
- A working `@honeymelon/browser-engine`: byte sniffing, header-only size
  checks, animated-image refusal, verified encoder discovery and a WAV writer.
- Web E2E suite across Chromium, Firefox, WebKit and a phone viewport, a
  benchmark and capability matrix, a workerd host contract and a guarded
  deploy/rollback workflow for the web app.
- Rebrand release gates: desktop identity tests, a release checklist, a
  rollback runbook, a name decision record and a transition guide.

- Browser video conversion to MP4 and WebM with WebCodecs (via Mediabunny),
  offered only where the browser verifies an encoder, up to 10 minutes.

### Changed

- Desktop metadata points at the workers.dev site; honeymelon.app is not
  renewed. The legacy comet-site Workers are retired.
- The site links to Honeymelon Web and describes its privacy only once
  `HONEYMELON_WEB_PRODUCTION_URL` is configured.
- Unavailable formats show the reason as a tooltip.

### Fixed

- Inactive media tabs now meet WCAG AA contrast in dark mode (desktop and web).

## v3.0.0-beta.1 — Release candidate preparation — 2026-10-17

This beta is not approved for production distribution. The public stable release
remains v2.2.3 until the native platform and distribution gates pass.

### Added

- npm/Turborepo workspaces for desktop, engine, contracts, shared UI, and E2E.
- Shared shadcn components, compact desktop controls, and a centered titlebar.
- Real conversion integration tests and packaged Playwright workflows.
- Native x64/ARM64 verification on macOS, Windows, and Linux, plus a Linux
  distribution compatibility matrix.
- Signed, tag-based release automation with artifact hashes and verification
  receipts; pull request checks cannot publish.

### Changed

- Replace Vue/Pinia with React and TypeScript, retaining five UI languages.
- Extract an Electron-free conversion engine with a single global execution slot.
- Replace fluent-ffmpeg with explicit native process and image worker execution.
- Expand capability-aware output formats and media conversion controls.
- Restrict the desktop bridge and persist versioned preferences in main.
- Enforce strict typing, linting, and 80-column formatting.

### Fixed

- Await cancellation and cleanup before reporting terminal job state.
- Preserve source files and avoid destination filename collisions.
- Retain settings across launches and import legacy locale/theme preferences.

### Release gates still required

- Successful CI on all six native targets and all configured Linux distributions.
- macOS signing/notarization and Windows signing credentials and verification.
- Release environment approval before publication.
- AMR, APE, and MPC fixture coverage before claiming every accepted input is
  verified. Formats without bundled encoder support remain unavailable.

## [v2.2.3](https://github.com/Thavarshan/comet/releases/tag/v2.2.3) - 2024-11-07

### Changed

- Revert Electron Forge and ESLint upgrades and reset ESLint configuration.

## [v2.2.2](https://github.com/Thavarshan/comet/compare/v2.2.1...v2.2.2) - 2024-10-20

### Changed

Release v2.2.1 by @Thavarshan in [https://github.com/Thavarshan/comet/pull/41](https://github.com/Thavarshan/comet/pull/41)

* Upgraded dependencies
* Update `namor` `generate` method usage
* Update to eslint to `v9.13`
* Update eslint configs

**Full Changelog**: [https://github.com/Thavarshan/comet/compare/v2.2.1...v2.2.2](https://github.com/Thavarshan/comet/compare/v2.2.1...v2.2.2)

## [v2.2.1](https://github.com/Thavarshan/comet/compare/v2.1.2...v2.2.1) - 2024-09-27

### Changed

* Update media assets

### Fixed

* Save directory path in Windows is not formatted properly

**Full Changelog**: [https://github.com/Thavarshan/comet/compare/v2.1.2...v2.2.1](https://github.com/Thavarshan/comet/compare/v2.1.2...v2.2.1)

## [v2.1.2](https://github.com/Thavarshan/comet/compare/v2.0.4...v2.1.2) - 2024-09-21

### Added

* Image conversion support using Jimp, enabling conversion of image formats such as PNG, JPEG, and BMP.

### Changed

* Improved UI design with a cleaner layout and enhanced user experience.
* Enhanced conversion performance with optimized resource usage, making conversions faster and more efficient.
* Upgraded conversion quality, particularly improving audio output and overall media fidelity.

### Fixed

* Fixed a non-persistent state issue where some settings (e.g., `convertTo` format) were not saved correctly between tab switches.
* Resolved conversion issues with certain video files that failed to process on specific platforms and architectures.
* Addressed conversion quality problems affecting the output of certain video files.
* Solved high resource usage during conversions, reducing CPU and memory consumption.
* Fixed a bug where removed files were still being processed in the conversion queue.

**Full Changelog**: [https://github.com/Thavarshan/comet/compare/v2.0.4...v2.1.2](https://github.com/Thavarshan/comet/compare/v2.0.4...v2.1.2)

## [v2.0.4](https://github.com/Thavarshan/comet/compare/v1.0.0...v2.0.4) - 2024-09-14

### Added

* Dark mode
* Multi-language support
* Audio conversion support

### Changed

* Improved UI design with better user experience
* Improved conversion performance withy less resource usage
* Improved conversion quality with better audio quality

### Fixed

* Non-persistent state issue
* Conversion issue with some video files on some platforms and architectures
* Conversion quality issue with some video files
* High resource usage issue
* Removed files would still be included in conversion queue

**Full Changelog**: [https://github.com/Thavarshan/comet/compare/v1.0.0...v2.0.4](https://github.com/Thavarshan/comet/compare/v1.0.0...v2.0.4)

## [v1.0.0](https://github.com/Thavarshan/comet/compare/v0.0.3...v1.0.0) - 2024-09-02

Initial stable release.

## [v0.0.3](https://github.com/Thavarshan/comet/compare/v0.0.2...v0.0.3) - 2024-08-24

### Added

* Realtime conversion progress and UI updates ([#13](https://github.com/Thavarshan/comet/issues/13))
* Cancel conversion featrue
* Already converted indication on UI
* Tooltips to cancel and remove buttons

### Changed

* Use `lucide-vue-next` icons instead of `@heroicons/vue`
* Window dimensions
* Use of `ffprobe` for video conversion progress tracking
* Title bar content

### Fixed

* Invalid executable name on `MacOS`

## [v0.0.2](https://github.com/Thavarshan/comet/compare/v0.0.1...v0.0.2) - 2024-08-22

### Added

* Overhauled UI and icons
* Update media content

### Fixed

* Published distributables are corrupt ([#5](https://github.com/Thavarshan/comet/issues/5))
* Unknown system error -88 ([#1](https://github.com/Thavarshan/comet/issues/1))

## [v0.0.1](https://github.com/Thavarshan/comet/compare/v0.0.0...v0.0.1) - 2024-08-17

Initial alpha release for public testing and feedback.

## [v2.2.3](https://github.com/Thavarshan/comet/compare/v2.2.3...v2.2.3) - 2024-11-07

### Changed

* Revert to previous electron-forge version
* Revert to previous eslint versions
* Reset eslint configurations


---

* Release v2.2.1 by @Thavarshan in https://github.com/Thavarshan/comet/pull/41
* Release v2.2.2 by @Thavarshan in https://github.com/Thavarshan/comet/pull/42

**Full Changelog**: https://github.com/Thavarshan/comet/compare/v2.2.1...v2.2.3
