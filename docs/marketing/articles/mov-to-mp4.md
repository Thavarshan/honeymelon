# MOV to MP4: choose the container and codec deliberately

**Draft for review. Not published.**

**Reader:** someone who wants a camera video in a more widely playable file.

A `.mov` extension tells you about the file container, not necessarily its video
or audio codec. The same is true of `.mp4`.

Changing an extension does not convert a file. A useful conversion checks what
is inside the source file and what the receiving device can decode.

## What to decide first

1. Keep the original file as a backup.
2. Decide where the result must play.
3. Inspect the source video and audio streams if you know how.
4. Prefer an output format that the receiving device actually supports.
5. Verify both picture and sound on the target device.

For broad compatibility, H.264 video and AAC audio in MP4 are common choices.
They are not guaranteed to be available in every build or suitable for every
source. A re-encode can take time and may reduce quality.

Some files can be remuxed without re-encoding when the streams are already
compatible. Remuxing changes the container, not the underlying media data.

## Using Honeymelon Desktop

Honeymelon provides local desktop video conversion. Select your video, choose
from the output formats the installed build makes available, configure any
relevant settings and inspect the result.

The currently published stable desktop build is **v2.2.3**. The React UI shown
in the README belongs to the **unsigned v3.0.0-beta.1**, not stable. The exact
controls and encoders vary by version and operating system.

Do not promise a particular codec until a real conversion has been tested on
that release and platform. An unsupported option should be treated as a
limitation, not silently replaced by an invented workaround.

## Check the output

Play the beginning, middle and end of the resulting file. Check audio sync,
aspect ratio, subtitles and file size. If quality is noticeably worse, try an
appropriate available quality setting and compare against the source.

Never discard your original until you have confirmed the output.

**Next step:** browse the
[stable desktop release](https://github.com/Thavarshan/honeymelon/releases/latest).

**Review gate:** verify MOV input and MP4 output with a synthetic sample on the
exact platform and release before publishing this tutorial.
