# Media kit copy and FAQ

**Editorial status:** Draft awaiting release, demo and website verification.

## Short description

Honeymelon is a free, open-source desktop media converter for video, audio and
images. Work locally without an account or media upload. Supported conversions
depend on the installed build and platform.

## Longer description

Honeymelon began as Comet, a desktop converter for everyday media tasks. Its
current development branch uses an Electron and React interface, with
platform-specific media tools and a shared conversion workflow. Users can
select files, choose supported output options and export results locally.

The last published stable desktop release is v2.2.3 under historical Comet
binary names. The newer v3.0.0-beta.1 desktop prerelease is unsigned and has
a different React interface. Its macOS and Windows installers may trigger
normal trust warnings.

The team is working on a browser edition, but availability and format support
must be verified before describing it as publicly launched.

## Common questions

### Does it upload my files?

The desktop app processes media locally. It does not require a Honeymelon
account or upload input files to Honeymelon-operated conversion servers.

### Can it convert every format?

No. Available formats, codecs and settings vary by platform and build. Consult
the actual format menu and test with a non-private file.

### Which download is stable?

[v2.2.3](https://github.com/Thavarshan/honeymelon/releases/tag/v2.2.3)
is the latest published non-prerelease desktop version. Its original asset
names still contain Comet.

### Is the v3 beta signed?

No. [v3.0.0-beta.1](https://github.com/Thavarshan/honeymelon/releases/tag/v3.0.0-beta.1)
is an unsigned prerelease. Its GitHub release contains a SHA256SUMS file and
published asset digests. A checksum does not replace software signing.

### Are stable v2.2.3 checksums published?

The current GitHub API does **not** expose SHA-256 digests for the stable
v2.2.3 binary assets. Do not fabricate a checksum or claim stable assets
have the same hash verification evidence as the 2026 beta.

### Is Honeymelon Web available now?

It is under active development. See [web launch #85](https://github.com/Thavarshan/honeymelon/issues/85).
Do not use browser UI screenshots or a live browser conversion CTA unless
the production launch gate is complete.

### How can someone help?

Read the [contribution guide](../../../.github/CONTRIBUTING.md), search
[issues](https://github.com/Thavarshan/honeymelon/issues) and share a
small reproducible report. Never publish personal media in issue threads.

## Media distribution checklist

- Link to [official releases](https://github.com/Thavarshan/honeymelon/releases).
- Describe macOS and Windows beta signing warnings accurately.
- Label beta images and old stable binaries with their actual release identity.
- Use original project screenshots and editable vector graphics.
- Verify each specific platform's download and checksum evidence.
- Do not imply a real recorded demo until the video is complete.
