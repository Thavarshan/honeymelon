# ADR 0003: browser media engine

Date: 28 October 2026. Status: accepted for Honeymelon Web beta; revisit with
the conditions below. Related:
[#78](https://github.com/Thavarshan/honeymelon/issues/78),
[#79](https://github.com/Thavarshan/honeymelon/issues/79),
[#80](https://github.com/Thavarshan/honeymelon/issues/80),
[#81](https://github.com/Thavarshan/honeymelon/issues/81),
[ADR 0001](0001-local-conversion-platform.md).

## Decision

Honeymelon Web uses the browser's own decoders and a small first-party encoder
instead of FFmpeg WebAssembly:

| Operation                | Implementation                                                                  | Output                              |
| ------------------------ | ------------------------------------------------------------------------------- | ----------------------------------- |
| Image → image            | `createImageBitmap` + `OffscreenCanvas` in a per-job worker                     | JPEG, PNG; WebP/AVIF only if probed |
| Audio → audio            | `OfflineAudioContext.decodeAudioData` on the main thread; PCM WAV in the worker | WAV, 16- or 24-bit                  |
| Video → audio (extract)  | Same audio path; the browser demuxes the container                              | WAV                                 |
| Video → image (frame)    | `<video>` seek + `createImageBitmap`; encoding in the image worker              | Image encoders above                |
| Video → video, other A/V | Not offered in the browser                                                      | Use Honeymelon Desktop              |

No FFmpeg core, third-party loader script or remote asset is fetched. Capability
discovery advertises only outputs that this path actually produces; every other
format is listed as unavailable with a reason that points to Desktop. No server
or remote fallback exists.

## Evidence

**FFmpeg WebAssembly (checked 28 October 2026, `npm view` and
`npm pack --ignore-scripts`):**

| Package           | Version | License          | Relevant size                                      |
| ----------------- | ------- | ---------------- | -------------------------------------------------- |
| `@ffmpeg/core`    | 0.12.10 | GPL-2.0-or-later | `ffmpeg-core.wasm` 32,232,419 bytes (ESM and UMD)  |
| `@ffmpeg/core-mt` | 0.12.10 | GPL-2.0-or-later | 65,700,111 bytes unpacked; needs SharedArrayBuffer |
| `@ffmpeg/ffmpeg`  | 0.12.15 | MIT              | Wrapper only; does not license the core            |

- The single-thread core exceeds Cloudflare's 25 MiB (26,214,400-byte) Static
  Asset limit, so it cannot ship as a first-party asset on the free plan
  ([previous probe](../compatibility/ffmpeg-wasm-asset-probe.json)).
- The published cores are GPL. Distributing one from an MIT-licensed web app
  brings source-offer and combination questions that need a licensing review
  this project has not had.
- The multithreaded core needs cross-origin isolation. The measured app pages
  report `crossOriginIsolated: false` and no `SharedArrayBuffer`
  ([benchmark](../compatibility/web-benchmark.json)). Adding COEP to every
  response would constrain future features for a capability we do not ship.
- A third-party CDN would make the privacy and offline story depend on an
  external host, against ADR 0001's delivery policy.

**Native browser path (measured; see the
[capability matrix](../web/capability-matrix.md)):** Chromium 156 and Firefox
157 decoded the MP3, FLAC and Ogg Opus fixtures and the Opus track of a VP9
WebM. They captured frames from that WebM and encoded JPEG, PNG and WebP.
Neither produced AVIF; WebKit 27.2 produced AVIF but fell back to PNG for WebP
in the [ADR 0001 probe](../compatibility/browser-image-probe.json). Every output
is verified in the worker (MIME type, magic bytes, re-decoded dimensions) or by
the WAV writer's own header. End-to-end tests download and inspect real outputs.

## Consequences

- Audio output is WAV only. MP3/AAC/Opus/FLAC _encoding_ is unavailable in the
  browser and points users to Desktop. Inputs are whatever the browser can
  decode, which varies (for example, Chromium builds without proprietary codecs
  cannot decode H.264/AAC MP4). Failures name the file and suggest Desktop.
- Decoding happens through `decodeAudioData`, which cannot be interrupted.
  Cancellation abandons the result and frees it, but the browser finishes its
  decode internally. Duration is read from media metadata **before** decoding
  and checked against the PCM budget, so oversized tracks never decode.
- Only the first audio track is available, matching `decodeAudioData`. Track
  selection above 0 is rejected before a job is created.
- Video frame capture runs a `<video>` element on the main thread, bounded to
  one frame. Encoding still happens in the worker.
- Video transcoding is not offered. #80's "bounded video" scope is delivered as
  frame capture and audio extraction with an explicit Desktop fallback, not as
  browser transcoding.

## Revisit when all of these hold

1. A reproducible FFmpeg WASM build with only the needed LGPL-compatible
   components, at or below 25 MiB, with recorded build flags, SHA-256 hashes and
   a corresponding-source location.
2. A licensing review approves distributing that build from the web app.
3. Measured cold-load bytes, peak memory and cancellation on Chromium, Firefox
   and WebKit (desktop and one real phone) fit the [limits](../web/README.md).
4. The core runs single-threaded, or cross-origin isolation is shown not to
   break downloads, the service worker or the site.

Until then the browser-engine package has no WebAssembly loader. That is
deliberate: an unused, unreviewed loader would only add surface area.
