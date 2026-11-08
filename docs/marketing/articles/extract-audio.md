# Extract audio from a video without uploading it

**Draft for review. Not published.**

**Reader:** a creator who has a recording and needs a separate audio file.

A video file commonly contains more than one media stream. To save its audio,
you can extract the relevant stream, sometimes without re-encoding it.

## Choose the output by the next task

- **MP3:** compact and widely supported for ordinary listening.
- **WAV:** useful for uncompressed editing, but often much larger.
- **FLAC:** lossless compression where supported by the intended tools.
- **AAC:** common in many video and mobile workflows.

The exact output choices depend on the software build and its encoders.
A file may have no audio stream, several language tracks or unusual codecs.

## A careful local workflow

1. Make a copy or keep the original video unchanged.
2. Select the video in your installed desktop converter.
3. Find the audio extraction task available in that version.
4. Choose an output format and destination.
5. Convert, then listen to the saved audio.
6. Compare duration, beginning, middle and ending against the source.

Honeymelon Desktop handles media locally, without a required account or
upload to a Honeymelon-operated service.

The README's current React interface depicts the **unsigned
v3.0.0-beta.1** desktop release. The latest stable desktop release is
**v2.2.3** and uses a different interface.

Some formats offer settings for bitrate, sample rate and channel count.
Higher bitrates do not restore quality already missing from the recording.
Converting lossy audio to a lossless container also does not make it
lossless in quality.

## Troubleshooting

If the file is silent, verify that the source actually has an audio track.
If it has multiple tracks, verify which one the converter chose.
If the output is too big, compare the available formats and settings.

Do not post private video or extracted audio in public bug reports.
Report the codecs and steps using a synthetic sample instead.

**Next step:** see the
[official releases](https://github.com/Thavarshan/honeymelon/releases).

**Review gate:** confirm a real input/output pair and the audio task on
the named desktop build before publication.
