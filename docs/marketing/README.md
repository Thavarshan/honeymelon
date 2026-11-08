# Honeymelon marketing operations

This directory contains the source-of-truth materials for a **$0 paid-media**
organic discovery and contributor-growth campaign. It does not change the
product name, GitHub repository identity, release processes, or customer data.

- [Campaign tracker / goals](https://github.com/Thavarshan/honeymelon/issues/110)
- [KPI scorecard](SCORECARD.md)
- [Six-week editorial calendar](EDITORIAL_CALENDAR.md)
- [Approved-for-review copy drafts](COPY_BANK.md)

## What we are marketing

**Current:** Honeymelon is a free, open-source desktop app that converts video,
audio and images locally with bundled media tools. Files do not need to be
uploaded to a Honeymelon-hosted service and the desktop app requires no account.

**Stable vs beta:** The project README identifies v2.2.3 as stable and
v3.0.0-beta.1 as an unsigned beta. Confirm release status before publication.
Current v3 screenshots depict the **beta**, not the stable build. Explain
platform trust warnings and point to official checksums where applicable.

**Website:** the static Next.js marketing site and Release Center are
implemented in `apps/site`. Verify the current public deployment before sharing
its URL; deployment evidence belongs in issue #72.

**Not yet released:** browser-based conversion and full browser/desktop format
parity. Honeymelon is the approved product name. The identity transition is
documented in `../architecture/0002-honeymelon-identity.md`.

## Audiences and honest value proposition

1. People needing a simple local video/audio/image converter: approachable UI,
   multiple-file intake, no media uploads to the service.
2. Privacy-conscious people: conversions happen locally; no Honeymelon account.
3. Engineers: a nontrivial, testable TypeScript/React/Electron/FFmpeg codebase,
   plus opportunities in test coverage, accessibility, docs and localization.

**Working hook:** Your media. Your computer. Your control.

Avoid claiming universal format/codec coverage, benchmark superiority or
stronger security guarantees than have been tested.

## First 90 days

- Oct 19–Nov 1: baseline, community trust/onboarding, verified product assets
- Nov 2–15: constructive feedback and appropriately targeted soft launch
- Nov 16–Dec 13: major release launch **only if product release gates pass**
- Dec 14–Jan 17: helpful tutorials, issue feedback and contributor retention

## Distribution policy

Value before links. Do not automate repeated Reddit/Discord/forum posts, send
unsolicited bulk DMs, solicit artificial stars/reviews, or cross-post identical
messages. Research current venue-specific rules before submitting. Discuss
limitations openly and participate where community questions are relevant.

Drafts in this directory are **not published announcements**. Check the actual
current release, URL, supported platform and brand decision immediately before
shipping. Existing engineering work in #61, #69–#72, #85 and rebrand #86–#96
takes precedence over premature marketing timelines.

## GitHub repository discovery and trust audit (rechecked 2026-11-09)

GitHub's repository API now lists the About description as:

> Honeymelon - free, open-source desktop media conversion for video, audio and images. Local processing, no account or uploads.

The homepage is the site Worker at
`https://honeymelon-site.tjthavarshan.workers.dev`. Current topics include
`media-converter`, `video-converter`, `audio-converter`,
`image-converter`, `electron`, `react`, `typescript`, `ffmpeg`,
`open-source`-adjacent categories and `cross-platform`. The old Vue/Vue3
topics and malformed Tailwind topic from the October audit are no longer
present. **The external homepage must still be tested against a live deployed
site before using it in launch announcements.**

The GitHub API also reports **Discussions disabled**. The original issue
chooser linked there despite no discussion area. The #112 docs/template
change replaces that dead entry point with the existing support guide and
allows a blank issue for non-bug questions.

| Check | Current evidence / action |
| --- | --- |
| Repository name, description, topics | GitHub REST API checked 2026-11-09; no stale Vue tags |
| Public homepage | Workers URL recorded; do not claim healthy deployment from metadata alone |
| Stable and beta release labels | README distinguishes v2.2.3 stable and unsigned v3.0.0-beta.1 |
| Bug and feature templates | Updated for actual products and runtime/codec reproduction |
| Support route | Support guide, GitHub issues and optional blank issue; not disabled Discussions |
| Security policy | Describes private reporting, development support caveats, and historical PGP key |
| Contributor setup | `.github/CONTRIBUTING.md` has pinned Node/npm and quality commands |

Do not describe beta features as available in the published stable binaries.
For questions involving private media, ask for synthetic fixtures.

## Weekly operating procedure

1. Re-check GitHub and published release truth; note data timestamp.
2. Update the scorecard with _measured_ deltas, and mark unavailable metrics.
3. Review developer feedback, first PRs, media bugs, beta status and website.
4. Publish only verified, venue-appropriate content.
5. Select the next three actions by useful feedback and attributable adoption.
6. Record decisions and link resulting issues/PRs.
