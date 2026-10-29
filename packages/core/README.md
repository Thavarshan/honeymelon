# @honeymelon/core

Platform-neutral conversion rules shared by desktop and browser service
adapters. The package imports contracts only; it has no Node, Electron, React,
filesystem, binary-discovery, or native process dependency. It builds with
ambient Node types disabled through `tsconfig.browser.json`.

## Ownership inventory

| Behavior                                                           | Current owner                    |
| ------------------------------------------------------------------ | -------------------------------- |
| Immutable job lifecycle, progress clamping, terminal/late events   | Core reducer                     |
| Portable service types, errors, output naming, snapshot acceptance | Core                             |
| Reusable single-slot queue and executor cleanup coordination       | `QueueConversionService` in core |
| Existing native queue, processes/workers, filesystem publication   | Native engine and its adapter    |
| File/Blob/native-path registries and destination selection         | Platform adapter                 |
| Shared React conversion workflow                                   | `@honeymelon/converter`          |
| Preferences persistence, document theme, platform controls         | Host application                 |

`QueueConversionService` is an executor-driven scheduler, not a media codec.
Executors provide capability discovery, validation, probing, execution, and
cleanup. Submitted jobs take priority over queued inspections. Cleanup failures
must not be reported as successful cancellation. The existing native engine
retains its own execution orchestration while sharing the reducer rules.

Native `Job` records structurally satisfy `ConversionJob`. The engine delegates
state decisions to the immutable reducer and applies the result to its existing
authoritative job record. It still holds one execution slot until native work
and cleanup finish. There is no renderer scheduler and no replay of serialized
jobs.

`cancel-requested` enters `canceling`; it does not claim cancellation is
complete. Only the adapter's cleanup-complete `canceled` event finishes
cancellation. Success/failure/progress events are ignored while canceling, and
all events are ignored after a terminal state. Timestamps come from adapters,
allowing deterministic tests without a platform clock dependency.

`serializeQueue` exports a typed domain view, omitting native path fields and
adapter handles even if a native record is supplied structurally. It is not an
untrusted-input decoder or permission to persist source media. Native request
validation remains in contracts. Portable requests and conversion-service ports
are defined here; platform adapters retain resource handles privately. See
[platform conversion services](../../docs/architecture/conversion-services.md)
for lifecycle, error, naming, and implementation boundaries.

## Verification

Core tests cover state transitions, cancellation races, repeated terminal
events, non-finite progress, FIFO selection, failure advancement, per-media
eligibility, codec/source-target availability, stale snapshots, and domain
serialization.

Existing engine queue tests continue to cover global concurrency, cancellation
cleanup waiting, shutdown, arrival order and immutable submissions. Native
integration tests retain real output/source-preservation/collision checks.
Desktop E2E tests verify picker flows, conversion, cancellation, restart
preferences, and legacy language/theme initialization.

Run `npm test -w @honeymelon/core`, root `npm run lint` / `npm run typecheck`,
native `npm run test:integration`, and desktop `npm run test:e2e` after a
desktop build. Cross-platform packaged CI remains required before merging
runtime changes.

## Commands and output

Run commands from the repository root with Node.js 24.22.0 and npm 12.2.0.
Install once with `npm ci`; run `npm run build:packages` before invoking
workspace checks directly so dependency exports exist. Root `npm run typecheck`
and `npm test` use Turbo to build upstream packages automatically.

```sh
npm run build -w @honeymelon/core
npm run typecheck -w @honeymelon/core
npm test -w @honeymelon/core
npm run dev -w @honeymelon/core
```

Import the public API from `@honeymelon/core`; TypeScript emits JavaScript and
declarations to `dist/`, and `dev` watches those outputs. The only workspace
dependency is contracts. Keep this package browser-safe: no Node, Electron,
React, filesystem handles, or media bytes. `@honeymelon/browser-engine` runs
real browser conversion on `QueueConversionService` with its own executor.
