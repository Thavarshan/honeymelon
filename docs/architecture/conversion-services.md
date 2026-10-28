# Platform conversion services

`@honeymelon/core` defines `ConversionService`, `InputFile`, `OutputTarget`, and
`ConversionRequest`. These types contain serializable metadata and opaque IDs.
They contain no native path, `File`, `Blob`, Electron event, or Node resource.
The native `BatchRequest` remains a distinct, validated transport DTO.

The shared workflow discovers capabilities, subscribes to queue changes, fetches
the initial snapshot, and submits immutable conversion requests. Consumers
accept only increasing queue revisions. Job and batch cancellation resolve after
the underlying engine finishes resource cleanup. Disposal is idempotent;
subsequent commands reject with `disposed`.

## Native ownership

`NativeConversionService` wraps an existing `ConversionEngine`. Its host
registers trusted intake files and selected directories, then passes only the
returned descriptors to shared code. The adapter resolves those IDs and uses the
existing engine's validation, FIFO scheduler, probes, abort handling, and atomic
collision-safe publication. It never trusts a descriptor's name or size in place
of the registered source. Foreign file and target IDs fail before execution.
Queue projections omit input and output paths.

Each adapter owns its engine. Call `dispose()` during host shutdown to abort
work, await cleanup, unsubscribe observers, and clear handle maps. Dispose the
service after a workflow ends; registered handles live until disposal.
Independent subscriptions return independent, repeatable unsubscribe functions.

The existing desktop bridge remains operational. Its renderer adapter supplies
the service and host UI ports consumed by `@honeymelon/converter`.
Renderer-owned registries retain native transport details; the living
main-process engine remains authoritative. The backend native adapter is also
available for Node hosts. React effect cleanup removes subscriptions and aborts
draft probes; it does not shut down the native engine.

See the [shared converter contract](../../packages/converter/README.md) for
host-owned preferences, optional platform actions, localization, and styles.

## Browser ownership

`BrowserConversionService` extends `QueueConversionService` with a browser
executor. The host registers selected `File` objects through `intake` and
receives opaque descriptors; the service resolves them itself and never trusts a
descriptor's name or size. Each job sniffs the file's bytes against its
extension, checks size, pixel and duration budgets before decoding, and runs on
a fresh worker that is terminated on completion, cancel, timeout or crash.
Outputs are in-memory Blobs with collision-free names (`photo (2).jpg`),
released by `cleanup`, `removeItem`, `clearMedia` and `dispose`. Capability
discovery probes the worker's real encoders and verifies their bytes; formats
the browser cannot produce are unavailable with a reason. See
[ADR 0003](0003-browser-media-engine.md).

`UnsupportedConversionService` keeps the previous all-unavailable behaviour for
contract fixtures and hosts that render the UI without conversion.

The package builds declarations and an actual self-contained Vite browser
library. Browser-externalization warnings fail the build. Repository import
boundary checks additionally prohibit native engine, Node, and Electron
dependencies. These checks cover the current dependency graph; future codecs
still need runtime privacy, memory, and compatibility tests.

## Errors and naming

`ConversionServiceError` carries stable command error codes. The classifier
recognizes explicit service errors and abort errors without parsing text.
Recoverable means the user may change inputs/settings or retry; it does not
authorize automatic retries. A disposed service must be recreated.

`outputFilename` derives a filename from a source label and validated format,
strips directory components and control characters, and replaces the source
extension. It does not reserve an output or overwrite an existing file. Native
publication still chooses a free filename atomically; browser export and
collision policy will be implemented with the image workflow.

## Verification

Run root lint, type checking, unit tests, and `npm run build:browser`. Service
tests exercise both adapters through the same typed interface: capability
isolation, opaque-handle resolution/rejection, path-free snapshots, progress,
independent subscriptions, abort completion, repeated cancellation, idempotent
disposal, unavailable formats, and portable target names. Existing engine
integration and packaged platform checks continue to protect the native
execution lifecycle.
