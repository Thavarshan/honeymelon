# Comet is becoming Honeymelon

Announcement and FAQ for #96. **Draft, 2026-10-28.** No Honeymelon desktop build
has been published yet: the current downloads are Comet v2.2.3 (stable) and
Comet v3.0.0-beta.1 (prerelease). Publish this text, with the version and links
filled in, only after the
[rebrand release checklist](rebrand-release-checklist.md) passes. Statements
below describe the source code and
[ADR 0002](../architecture/0002-honeymelon-identity.md) as of this date.

---

Comet, the free desktop media converter, is now **Honeymelon**. Same app, same
author, same open-source license, same promise: your files are converted on your
own computer and never uploaded.

## What changes

- **Name and icon.** The app, installers and website are called Honeymelon, with
  a new melon icon.
- **Repository.** The project lives at
  [github.com/Thavarshan/honeymelon](https://github.com/Thavarshan/honeymelon).
  Old `github.com/Thavarshan/comet` links redirect there automatically.
- **Website.** The site is at
  [honeymelon-site.tjthavarshan.workers.dev](https://honeymelon-site.tjthavarshan.workers.dev).
  The old `comet.thavarshan.com` address no longer works.
- **A separate app on your computer.** Honeymelon installs **next to** Comet; it
  does not replace or remove it. You will see both in your Applications folder,
  Start menu or app launcher until you remove Comet yourself.
- **Download filenames** start with `honeymelon-` instead of `comet-`.

## What stays the same

- **Free and open source** under the MIT license. Issue, release and code
  history are preserved.
- **Local conversion.** Video, audio and image conversion runs on your machine
  with the bundled FFmpeg tools. No account, no upload, no conversion server.
- **No telemetry.** The desktop app contains no analytics, tracking, account
  system or automatic updater. It does not connect to the internet to convert.
- **Languages:** English, Spanish, French, German and Russian.
- **Platforms:** macOS, Windows and Linux, each on x64 (Intel/AMD) and ARM64.

## Your settings

When Honeymelon starts for the first time, it looks for settings saved by
**Comet 3** (the v3.0.0 beta). If it finds them, it copies your language, theme,
output formats and save location. It only copies; Comet's own settings file is
never changed or deleted.

- If you already used Honeymelon, its settings are kept and nothing is copied.
- **Comet 2.x** stored settings differently and they are **not** copied. Choose
  your preferences again in Honeymelon; Comet 2.x keeps its own.
- The conversion queue is not copied. Honeymelon starts with an empty queue.
- Cookies, caches and anything other than these settings are not copied.

## Upgrade steps

1. Download the Honeymelon build for your system from the
   [releases page](https://github.com/Thavarshan/honeymelon/releases) or the
   website's download page. Choose x64 or ARM64 to match your computer.
2. Optional but recommended: check the file against `SHA256SUMS` from the same
   release.
   - macOS: `grep -F '  FILE' SHA256SUMS | shasum -a 256 -c -`
   - Linux: `grep -F '  FILE' SHA256SUMS | sha256sum -c -`
   - Windows PowerShell: `(Get-FileHash -Algorithm SHA256 .\FILE).Hash`, then
     compare with the line for `FILE` in `SHA256SUMS`.
3. Install it:
   - **macOS:** unzip and move **Honeymelon** to Applications.
   - **Windows:** run `honeymelon-…-setup.exe`, or unzip the portable ZIP.
   - **Linux:** install the `.deb` or `.rpm` (package name `honeymelon`), or
     extract the portable `.tar.gz`.
4. Open Honeymelon and check your settings.
5. When you are happy, you may uninstall Comet. Removing Comet does not affect
   Honeymelon, and removing Honeymelon does not affect Comet.

To go back, quit Honeymelon and open Comet; its settings are as you left them.

## Where Comet went

Every earlier Comet release stays available with its original filenames and
checksums:

- [Comet v2.2.3](https://github.com/Thavarshan/honeymelon/releases/tag/v2.2.3) —
  last stable Comet release.
- [Comet v3.0.0-beta.1](https://github.com/Thavarshan/honeymelon/releases/tag/v3.0.0-beta.1)
  — last Comet prerelease (unsigned test build).
- [All releases](https://github.com/Thavarshan/honeymelon/releases).

New fixes ship in Honeymelon.

## How to recognize the real Honeymelon

- Official builds are published **only** on the
  [Thavarshan/honeymelon releases page](https://github.com/Thavarshan/honeymelon/releases);
  the website links there and never hosts installers itself.
- Each release lists a SHA-256 checksum for every file in `SHA256SUMS`.
- Signed builds identify the publisher: _[fill in the macOS Team ID and Windows
  certificate subject at release]_.
- Honeymelon never asks you to create an account, pay, or upload media.

## Reporting problems

Open an issue at
[github.com/Thavarshan/honeymelon/issues](https://github.com/Thavarshan/honeymelon/issues).
A free GitHub account is the only account needed; there is no other sign-up, and
no data is collected automatically. Please include:

- Honeymelon version, operating system and version, and x64 or ARM64.
- How you installed it (ZIP, setup, portable, `.deb`, `.rpm`, `.tar.gz`).
- Whether Comet is also installed and which version you upgraded from.
- Steps to reproduce, and the input and output formats involved. Do not attach
  private media.

Report security problems privately as described in the
[security policy](https://github.com/Thavarshan/honeymelon/security/policy).

## FAQ

**Is this a different product?** No. Honeymelon is the same codebase, author and
license as Comet, renamed.

**Why does Honeymelon install separately instead of updating Comet?** The new
name comes with new operating-system identifiers. Installing separately means an
upgrade can never silently remove Comet or its settings, and you can switch back
at any time.

**Will Comet keep working?** Yes. Installed copies keep working, and every
published Comet release stays downloadable.

**Does Honeymelon upload my files?** No. Conversion happens on your computer.

**Is there a browser version?** Honeymelon Web (beta) is built and tested and
will be linked from the website once it is deployed. It converts images, audio
to WAV and still frames from video inside your browser tab, without uploading
files, and supports fewer formats and smaller files than Desktop. See its
[limits and privacy page](../web/README.md). It is separate from this rename:
Desktop users do not need it.

**Which Linux distributions are tested?** CI runs the packaged app on Ubuntu
24.04, Debian 12 and 13, Ubuntu 22.04, Fedora 43 and openSUSE Leap 16 on both
architectures, plus Arch Linux on x64. Other distributions may work but are not
tested.

**Is Honeymelon related to the older "Honeymelon" project?** Honeymelon reuses
no code or artwork from any earlier project of that name; see the
[brand provenance record](../branding/provenance.md).

---

## Before publishing (remove this section)

- [ ] Release checklist passed and linked; version and download links filled in.
- [ ] Signing identities filled in under "How to recognize the real Honeymelon".
- [ ] Website address final: `honeymelon.app` currently does not resolve and its
      registration expires 2026-11-03 (see the
      [name decision record](../branding/name-decision-record.md)). Keep the
      workers.dev address unless the custom domain is validated.
- [ ] Owner decides whether to name the separate historical Honeymelon
      repository in the FAQ.
- [ ] Minimum OS versions documented, or the guide keeps saying nothing about
      them.
- [ ] Post-launch smoke tests recorded: download links, legacy redirects, search
      previews, and upgrade on real machines.
- [ ] Changelog entry and README updated by their owners.
