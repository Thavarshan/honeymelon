# Editorial calendar: 2026-11-09 to 2026-12-20

**Status:** Proposed six-week schedule; none of these entries is published.

**Owner:** Maintainer (assignment and review date pending).

**Budget:** $0. Use the existing GitHub repository and static site.

The work is educational content, not a promise of a release date.
Do not publish a conversion claim before testing it on the named build.

## Week 1: November 9–15

### MOV to MP4 without the codec confusion

- Audience: people converting camera videos.
- Reader intent: understand container and codec compatibility.
- Target query: `mov to mp4 locally`.
- Channel: documentation article, then an approved community answer.
- Draft: [MOV to MP4](articles/mov-to-mp4.md).
- State: authored; needs product/platform conversion verification.
- CTA: current stable desktop download.
- Outcome: count substantive reader questions, not views alone.

### How Honeymelon is structured

- Audience: TypeScript/Electron engineers.
- Reader intent: understand native versus browser conversion boundaries.
- Channel: DEV or GitHub, only when rules permit.
- Draft: [Architecture story](articles/engineering-local-conversion.md).
- State: authored; verify code paths and version terms.
- CTA: read source and discuss a focused issue.
- Outcome: verified issue feedback or useful contribution.

## Week 2: November 16–22

### Extracting a video's audio track

- Audience: creators with existing video recordings.
- Target query: `extract audio from video offline`.
- Draft: [Extract audio](articles/extract-audio.md).
- State: authored; needs output-format smoke test.
- CTA: stable desktop download.
- Outcome: useful troubleshooting feedback.

### First contribution walkthrough

- Audience: new open-source contributors.
- State: planned; blocked on #115 verifying small tasks.
- CTA: verified newcomer issues.
- Outcome: first reproducible issue or PR discussion.

## Week 3: November 23–29

### PNG to WebP: when smaller is not always better

- Audience: people optimizing images.
- Target query: `png to webp quality transparency`.
- Draft: [PNG to WebP](articles/png-to-webp.md).
- State: authored; verify transparency and codec settings.
- CTA: desktop image conversion.
- Outcome: actionable size/quality reports with synthetic samples.

### Beta notes explained

- Audience: potential desktop beta testers.
- State: planned; release and checksum gates required.
- CTA: review the published beta release page.
- Outcome: concrete bug reports, not raw download claims.

## Week 4: November 30–December 6

- Topic: conversion queue cancellation and safe output naming.
- Reader: engineers and advanced users.
- State: planned; confirm behavior with current tests.
- CTA: contributor docs and focused tests.
- Outcome: useful review comments or regression coverage.

## Week 5: December 7–13

- Topic: how to test a desktop media converter across operating systems.
- Reader: QA engineers and contributors.
- State: planned; use verified CI, no unsupported success claims.
- CTA: reproduce a public non-sensitive test.
- Outcome: improved test cases and accepted contributions.

## Week 6: December 14–20

- Topic: what we learned from real testers.
- Reader: users and open-source contributors.
- State: blocked until feedback exists and publication consent is checked.
- CTA: submit actionable feedback.
- Outcome: verified issues resolved and independently reported lessons.

## Publishing gate for every item

- Confirm the stable release and unsigned beta version labels.
- Test the described formats and platform with synthetic samples.
- Check dates, references, image captions and working links.
- Confirm no claim that browser conversion is publicly deployed.
- Check trademark/product identity and current site URL.
- Verify the destination's current community and promotion rules.
- Obtain review and publication approval.
- Record the actual post URL, date, feedback and next action.
- Never manufacture conversions, testimonials or analytics.

A planned public launch remains blocked on #85 and its deployment checks.
