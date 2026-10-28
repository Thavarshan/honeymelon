# @honeymelon/browser-engine

The browser implementation of `ConversionService`. Files are converted inside
the page: no upload, server, WebAssembly download or network API. Decision and
evidence: [ADR 0003](../../docs/architecture/0003-browser-media-engine.md).

## Exports

- `BrowserConversionService` extends core's `QueueConversionService` (one job at
  a time, FIFO, revisioned snapshots) with a browser executor. Construct it with
  `createWorker()`, which returns a worker running the `./worker` export, and
  optionally a `MediaRuntime` and `ResourceLimits`.
  - `intake(files)` registers `File` handles and returns path-free descriptors.
    `output(jobId)` / `outputs()` expose converted Blobs and collision-free
    download names; `retainedBytes()` reports memory held.
  - `removeItem`, `clearMedia` and `dispose` release jobs, outputs and handles.
- `@honeymelon/browser-engine/worker`: the media worker entry. The host bundles
  it, for example Vite's
  `import Worker from '@honeymelon/browser-engine/worker?worker'`.
- `deviceLimits(navigator.deviceMemory)` and `defaultLimits`: conservative
  per-tab budgets (input bytes, pixels, decoded PCM, retained outputs, queue
  length, job deadline).
- `domMediaRuntime()`: media-element metadata, video frame capture and audio
  decoding; replaceable in tests.
- `UnsupportedConversionService`: advertises nothing; for contract fixtures.
- `encodeWav`, `readWavHeader`, `sniff`: small pure utilities.

## Behaviour

| Request                       | Path                                                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Image → JPEG/PNG/WebP/AVIF    | Worker: `createImageBitmap` (EXIF-oriented) → fit → `OffscreenCanvas` → encode → verify MIME, magic bytes and re-decoded size |
| Audio → WAV                   | Main thread `decodeAudioData` at the source (or requested) rate; worker mixes channels and writes 16/24-bit PCM               |
| Video → WAV                   | As audio; the browser demuxes the first audio track                                                                           |
| Video → image                 | `<video>` seek to the timestamp, capture a bitmap, encode in the worker                                                       |
| Video → video, other encoders | Unavailable with a reason pointing to Desktop                                                                                 |

Before any decode, the executor checks that the bytes match the extension,
rejects animated GIF/APNG/WebP/AVIF rather than flattening them, reads
dimensions from headers against the pixel budget, and reads duration against the
PCM budget. Each job gets a fresh worker; cancel, timeout, `error` and
`messageerror` terminate it and the job ends canceled or failed with a clear
message. Capability discovery runs one probe worker and caches the result.

## Build and checks

From the repository root with Node.js 24.22.0 and npm 12.2.0:

```sh
npm run build -w @honeymelon/browser-engine
npm run typecheck -w @honeymelon/browser-engine
npm test -w @honeymelon/browser-engine
npm run test:web
```

Build emits declarations and JavaScript to `dist/` and also bundles both entries
with Vite into `.bundle/`, which fails on any browser-externalization warning.
Unit tests run in Node with a scripted worker and runtime, including a guard
that stubs every network API. Real encoding is covered by the web E2E suite.
Dependencies are limited to contracts and core.
