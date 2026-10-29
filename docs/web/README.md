# Honeymelon Web: limits, privacy and support

Honeymelon Web (beta) converts files inside your browser tab. It is a smaller
companion to
[Honeymelon Desktop](https://github.com/Thavarshan/honeymelon/releases), not a
replacement for it.

## What it can do

| Source             | Output                                                     | Notes                                                           |
| ------------------ | ---------------------------------------------------------- | --------------------------------------------------------------- |
| JPEG, PNG, WebP    | JPEG, PNG; WebP and AVIF only if this browser encodes them | Resize (downscale only), quality, background for transparency   |
| BMP, still GIF     | Same as above                                              | Animated GIF, APNG and animated WebP are refused, not flattened |
| AVIF               | Same as above                                              | Only where this browser decodes AVIF                            |
| MP3, FLAC, Ogg, …  | WAV (16- or 24-bit)                                        | Sample rate, mono/stereo; input support depends on the browser  |
| WebM, MP4 and more | MP4 or WebM video, WAV (audio track), or a still image     | Encoders are probed per browser; up to 10 minutes per video     |

The format menu marks everything else (other containers, ProRes, MP3/AAC
encoding) as unavailable, and the tooltip says why. Unavailable formats are
never offered and then failed.

Output names follow the source name (`photo.png` → `photo.jpg`). Duplicate names
get a suffix (`photo (2).jpg`). EXIF orientation is applied; other metadata
(EXIF, ICC profiles, tags) is not copied.

## Limits

Limits protect the tab, not a promise about every device. They halve on devices
reporting 4–7 GB of memory and quarter below 4 GB (Chromium reports memory;
other browsers use the defaults).

| Limit                                | Default (8 GB+)                                    |
| ------------------------------------ | -------------------------------------------------- |
| Image file / audio file / video file | 100 / 128 / 256 MiB                                |
| Image or video frame pixels          | 50 megapixels                                      |
| Decoded audio                        | 512 MiB of PCM (about 11 minutes of 48 kHz stereo) |
| Finished files held for download     | 512 MiB                                            |
| Files in one tab                     | 200                                                |
| Video length                         | 10 minutes                                         |
| One conversion                       | 15 minutes                                         |

Files are converted one at a time, each in a fresh background worker. Cancel
stops the worker immediately and discards partial output. Large files, long
tracks, animated images and other video formats belong in Desktop.

## Privacy

- Selected files, decoded media and converted results stay in the tab's memory.
  They are not uploaded, logged or written to browser storage. Closing or
  reloading the tab discards them, and the app warns first if you have running
  jobs or files you have not downloaded.
- There is no account, analytics, telemetry or conversion server. The app's
  Content Security Policy allows network requests only to its own origin, and
  the built code is checked to contain no `fetch`, beacon, WebSocket or
  XMLHttpRequest calls outside the offline cache. End-to-end tests block every
  request that leaves the origin or carries a body, during real conversions.
- Settings (language, theme, output choices) are saved in this browser's local
  storage. The offline cache holds the app's own files only, under a versioned
  name, and a new version replaces the old cache.
- The static host may process ordinary request information such as IP addresses.
  This is not an anonymity tool.

The [threat model](../security/web-threat-model.md) maps each claim to its test.

## Browsers

| Browser                    | Status                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| Chrome / Edge (Chromium)   | Full automated suite. Edge-branded smoke test pending                                            |
| Firefox                    | Full automated suite except offline start, which Playwright cannot emulate; manual check pending |
| Safari (WebKit)            | Automated suite runs in CI on WebKit. WebKit is not Safari; real Safari checks pending           |
| iOS Safari, Android Chrome | Phone-sized layout tested in emulation only. Real-device checks pending                          |

Pending items are tracked in the
[web launch checklist](../releases/web-launch-checklist.md). Measured numbers
are in the [capability matrix](capability-matrix.md).

## Offline and installing

After the first visit, the app works offline: it caches only its own files.
Chrome and Edge show an install button in the address bar. On Android choose
**Add to Home screen**; in Safari choose **Share → Add to Dock** or **Add to
Home Screen**. When a new version is ready the app tells you, and it reloads
only when you choose to, so a running conversion is never cut off.

## Troubleshooting

- **"does not contain the media its extension describes"**: the file was renamed
  or is damaged. Honeymelon checks the actual bytes, not the name.
- **"could not decode"**: this browser lacks the codec (for example H.264 in
  some Chromium builds). Try another browser or Desktop.
- **"exceeds the … browser limit"**: use Desktop, or resize first.
- **"Confirm transparency flattening"**: JPEG has no transparency. Turn on _Use
  first frame / flatten transparency_ in Output settings and choose a background
  colour, or pick PNG.
- **A format is greyed out**: hover it to see why. WebP and AVIF depend on the
  browser's encoder.
- **Nothing downloads**: allow multiple downloads for the site, or use
  **Download all**, which saves one ZIP.

Report problems through
[GitHub issues](https://github.com/Thavarshan/honeymelon/issues/new/choose).
Include the browser and version and the message under _Technical details_. Never
attach private media; describe it or share a file you are happy to make public.
