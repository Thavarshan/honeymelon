# Honeymelon Web capability and performance matrix

Version: `@honeymelon/web` 0.1.0. Raw data:
[web-benchmark.json](../compatibility/web-benchmark.json). Reproduce:

```sh
npm run build:packages && npm run build -w @honeymelon/web
npm exec -w @honeymelon/e2e -- playwright install chromium firefox webkit
node packages/e2e/scripts/benchmark-web.mjs --engines chromium,firefox,webkit --assert
```

Measured 2026-10-28 on Linux (WSL2 6.18), Intel Core i5-1334U, 12 threads, 8
GiB, with Playwright 1.64.1. Times are wall clock from **Convert** to
**Complete**, including worker start-up, decoding, encoding and output checks.
They are one sample per cell: read them as orders of magnitude, not targets.

## Capabilities (what the format menu offers)

| Engine           | JPEG | PNG | WebP | AVIF | GIF/BMP/TIFF out | WAV out | Other audio out | Video out |
| ---------------- | ---- | --- | ---- | ---- | ---------------- | ------- | --------------- | --------- |
| Chromium 156     | yes  | yes | yes  | no   | no               | yes     | no              | no        |
| Firefox 157      | yes  | yes | yes  | no   | no               | yes     | no              | no        |
| WebKit 27.2 (\*) | yes  | yes | no   | yes  | no               | yes     | no              | no        |

(\*) WebKit row from the
[ADR 0001 encoder probe](../compatibility/browser-image-probe.json). The WebKit
end-to-end suite runs in CI (it needs system libraries this lab host lacks),
which skips WebP there by design. Neither engine above is cross-origin isolated
(`SharedArrayBuffer` unavailable); nothing here needs it.

Decoded in both measured engines: MP3, FLAC, Ogg Opus, WAV, and the VP9/Opus
WebM fixture (audio extraction and frame capture).

## Timings (ms)

| Case                          |         Chromium 156 |          Firefox 157 |
| ----------------------------- | -------------------: | -------------------: |
| Start-up to usable UI         |                  196 |                  434 |
| 1 MP PNG → JPEG / PNG / WebP  |      147 / 173 / 277 |      180 / 192 / 273 |
| 12 MP PNG → JPEG / PNG / WebP |    889 / 267 / 1,371 |    418 / 304 / 1,442 |
| 24 MP PNG → JPEG / PNG / WebP |    859 / 865 / 2,394 |    960 / 543 / 2,569 |
| 48 MP PNG → JPEG / PNG / WebP | 1,358 / 851 / 11,925 | 2,007 / 938 / 11,264 |
| 1 min WAV → WAV               |                  251 |                1,402 |
| 10 min WAV → WAV              |                1,350 |                9,116 |
| 1 s MP3 / FLAC / Ogg → WAV    |       126 / 129 / 86 |      169 / 172 / 163 |
| 2 s WebM → WAV (audio track)  |                  161 |                  161 |
| 2 s WebM → PNG (frame)        |                  145 |                  180 |

Observations: WebP encoding of very large images is the slowest operation (about
11–12 s at 48 MP, near the 50 MP limit). Firefox decodes long PCM about 6–7×
slower than Chromium. Both stay far inside the 5-minute job deadline.

## Regression thresholds

`benchmark-web.mjs --assert` fails when an `ok` result exceeds these. They are
deliberately generous so they catch structural regressions (main-thread
encoding, repeated decodes), not machine noise. Use them for periodic manual
gating or a scheduled job on a standard runner, not on every PR.

| Case             | Threshold |
| ---------------- | --------: |
| Start-up         |  5,000 ms |
| 12 MP → JPEG     |  8,000 ms |
| 12 MP → PNG      | 15,000 ms |
| 1 min WAV → WAV  |  6,000 ms |
| WebM frame → PNG |  6,000 ms |

Release-blocking correctness checks are separate: `npm run test:web` must pass
on every PR.

## Not yet measured

- WebKit and real Safari timings; iOS Safari and Android Chrome on real phones.
- Behaviour under real memory pressure (low-memory devices, many tabs). Limits
  are enforced before decoding where possible, and the worker-crash path is unit
  tested, but no device has been driven to exhaustion.
- Edge-branded Chromium.
