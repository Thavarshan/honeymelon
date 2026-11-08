# Honeymelon campaign copy bank — drafts, not published

Prepared 2026-10-18. Final copy requires fresh release, website and naming
checks. Public messages must not accidentally attribute v3 features/UI to the
stable v2.2.3 binary or promote Honeymelon Web as available.

## Short descriptor

**Honeymelon** is a free, open-source desktop media converter for video, audio
and images. Convert files locally without creating an account or uploading them.

## Hero concept (working)

**Your media. Your computer. Your control.**

Convert video, audio and image files locally with a straightforward desktop app
powered by open-source media tooling.

- Primary CTA: **Download stable desktop version**
  https://github.com/Thavarshan/honeymelon/releases/latest
- Secondary CTA: **Explore the source / contribute**
  https://github.com/Thavarshan/honeymelon
- Separate beta CTA: **Try unsigned 3.0 beta**
  https://github.com/Thavarshan/honeymelon/releases/tag/v3.0.0-beta.1

The 3.0 beta currently has operating-system trust warnings because installers
are unsigned. Verify release hashes before trusting downloads. Do not use the
beta screenshots to depict the current stable release.

## Contributor invitation — GitHub/DEV draft

**Want a real open-source TypeScript project to contribute to?**

We're rebuilding Honeymelon, an open-source desktop app for converting video,
audio and images locally. The desktop app uses Electron; our newer beta uses
React and TypeScript, and the codebase includes native conversion execution,
shared domain contracts and platform test coverage.

Useful contributions aren't limited to big features. Documentation, smaller
UI/accessibility fixes, localization, reproducible bug reports and targeted
tests all matter.

If you'd like to explore the code or help, start here:
https://github.com/Thavarshan/honeymelon

We are still validating the 3.0 beta and planning (not shipping) a browser
experience. Feedback about what feels confusing is as useful as a PR.

**Publishing check:** ensure newcomer issues are genuinely small and ready, and
confirm public channel permits project posts.

## Beta testing invitation — draft

**Honeymelon 3.0 beta testers wanted**

Honeymelon is a free, open-source media converter. The next desktop version has
a refreshed React interface and expanded conversion controls, and we'd value
real-world feedback on usability and format compatibility.

This is an **unsigned beta**, not the recommended stable build. macOS and
Windows may display trust warnings. Only download from official GitHub Releases,
review the release notes and verify the published SHA-256 hashes.

Test release:
https://github.com/Thavarshan/honeymelon/releases/tag/v3.0.0-beta.1 Report
issues: https://github.com/Thavarshan/honeymelon/issues

Please include OS/architecture, source and destination formats, steps to
reproduce, actual vs expected behavior and any relevant logs. Don't upload
private media files to public issue threads.

**Publishing check:** verify the listed beta tag and artifacts are still live,
and that project maintainers can realistically triage incoming reports.

## Developer article opening — draft

### Building Honeymelon: a media converter that works locally

Converting a video should not require uploading it somewhere or learning a long
command-line invocation. That's the problem behind Honeymelon, a small,
open-source desktop application for video, audio and image conversion.

Behind the interface, the project has a less obvious set of engineering
problems: coordinating native work, cancelling running jobs without leaving
unwanted output behind, avoiding file-name collisions, and testing packaged
applications on different operating systems. We're documenting those decisions
as we modernize the Electron app and investigate a future browser edition.

The desktop app is real. The browser edition remains a roadmap item, not a
released online converter.

## Directory listing (only after platform confirmation)

**Title:** Honeymelon — Open-source desktop media converter

**Description:** Free desktop application for converting video, audio and images
locally. No account or media upload required. Browse the source and choose the
stable installer available for your operating system.

**Categories:** Media conversion, video tools, audio tools, image tools,
open-source desktop software.

## Do not claim

- That every source/target format can be converted.
- That Honeymelon 3.0 UI is part of v2.2.3 stable.
- That macOS and Windows binaries are currently trusted/signed.
- That Honeymelon Web has launched or matches native FFmpeg capabilities.
- That local processing prevents all possible security/privacy risks.
- That performance is superior to HandBrake/Shutter Encoder without tests.
- That a Honeymelon → Honeymelon rename has been approved.

Related tickets: #110, #112, #114, #116, #117.

## Additional channel-specific drafts (2026-11-09)

All copy below is **for approval only**, not an announcement. Verify the live
version, links and each venue's policies before posting.

### README opening

Honeymelon is a free, open-source desktop media converter. Work with video,
audio and images locally without creating an account. The latest stable build is
v2.2.3. The React-based v3.0.0-beta.1 is an unsigned test release.

### Beta release note

**Honeymelon 3.0 desktop beta: help us test**

The React UI changes how conversion batches and settings are managed. Please try
safe synthetic files and report the exact OS, build, codec and output behavior.

This is an unsigned beta, not the current stable desktop release. OS trust
warnings can appear. Use the official GitHub release assets and published
SHA-256 hashes. Do not report private media in public issues.

### Product Hunt draft (publication blocked)

**Honeymelon — local video, audio and image conversion**

Honeymelon is an open-source desktop converter with no required account. It
keeps media processing on your computer. The current stable release is v2.2.3;
an unsigned React-based beta is available separately.

We would value feedback on format compatibility and usability. We are not
claiming a public web converter or universal codec support.

**Gate:** only submit if the chosen build is verified, launch support capacity
exists, and Product Hunt's current rules permit the listing.

### Show HN draft (publication blocked)

**Show HN: Honeymelon, a free desktop media converter**

I have been working on an open-source converter for video, audio and images that
runs locally. The project started as Comet and is now becoming a shared React
and TypeScript desktop/browser architecture.

Desktop binaries are available; the browser converter is still behind release
checks. I'd especially appreciate technical feedback on the native/browser
boundary, conversion failures and accessibility.

**Gate:** follow current Hacker News Show HN and self-promotion rules. Post only
from an approved owner identity and participate in discussion.

### Community directory summary

Free, open-source desktop converter for video, audio and images. Conversions run
locally without a required account. Choose the stable build from official GitHub
Releases. The newer React desktop build is an unsigned beta.

**Gate:** confirm directory terms, live downloads and platform support.

### Website hero review

**Your media. Your computer. Your control.**

Convert media locally with Honeymelon Desktop. Choose the stable release or
explore the separately labeled beta. Do not show a browser-converter CTA until
the web deployment is live.

### Review record

- Editorial schedule: [current calendar](EDITORIAL_CALENDAR_2026-11.md).
- Tutorial drafts: [articles](articles/).
- Owner approval: pending.
- Published links: none yet.
- Format and release evidence: pending per publication.
