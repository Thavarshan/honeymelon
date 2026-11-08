# Tailored outreach copy for approval

**Drafts only. None have been published.** These should be rewritten in the
approved publisher's own voice for the actual venue. Some platforms, notably
Hacker News, restrict generated text; do not paste this verbatim there.

## DEV: practical engineering article introduction

**Title:** What a desktop media converter taught me about browser boundaries

The interesting part of sharing a React interface between Electron and a
browser isn't moving components. It's accepting that the conversion engines
have different inputs, outputs and limits. A desktop build can reach local
FFmpeg and file paths; a browser must respect file objects, worker memory
and available codecs. Here's how I separated the contracts, queue model and
platform adapters, including what failed and how I tested it.

**Give readers the whole article on DEV.** Use the source-backed draft at
[engineering-local-conversion.md](../articles/engineering-local-conversion.md).
Include a source link only where it adds useful context.

## Reddit: answer-first response (subreddit rules must be checked)

When converting MOV to MP4, check which codecs are inside the MOV first.
MOV and MP4 are containers, so renaming the extension doesn't necessarily
help. If the existing streams are compatible, remuxing avoids a quality
loss; if not, choose a codec supported by the destination device and test
audio sync. I'd keep the original until playback is confirmed.

**No link by default.** Only mention Honeymelon if a member explicitly asks
for a suitable open-source option and the subreddit permits such replies.

## GitHub: useful contributor invitation within the own repository

**Title:** New to media conversion or React? Here's where to start.

This is a real Electron/React project with conversion testing, documentation,
accessibility, and platform adapter work. Start by reproducing a narrow bug
or running a specific test; please don't claim an issue is beginner-friendly
until a maintainer verifies its scope. Read CONTRIBUTING and the actual issue
acceptance criteria. Report media problems with synthetic files.

Use the repository's own issue or README. Do not advertise in other people's
unrelated issue trackers.

## Show HN: publication brief, not a ready-to-post generated submission

**Concept:** an honest, first-person explanation of a real downloadable
desktop media converter, why it was made, supported platforms, and a sample
local conversion. Provide a verified direct download or executable demo.
Disclose stable v2.2.3 vs unsigned beta v3, avoid claiming unreleased web
conversion, and be present to answer hard questions. Have the actual maker
write this personally; do not paste AI-drafted HN posts.

Only post when the owner has a live, easily tried result and follows
[Show HN requirements](https://news.ycombinator.com/showhn.html).

## Product Hunt: description for owner review

**Name:** Honeymelon

**Tagline:** Free, local video, audio and image conversion

**Description:** Honeymelon is an open-source desktop converter that
processes supported media locally without a required account or upload.
The published v2.2.3 desktop release remains stable; an unsigned v3 beta
is available separately. Browser support is still undergoing launch checks.

The final submission needs a verified product URL, real demo, versioned
screenshots, maker account and discussion availability. Invite feedback,
never upvotes.

## Software directory: factual listing

**Title:** Honeymelon (formerly Comet)

**Description:** Open-source desktop tool for local video, audio and image
conversion, available through official GitHub Releases for supported systems.
Versions differ in interface and supported codecs. The latest published stable
desktop build is v2.2.3; the v3.0.0-beta.1 desktop prerelease is unsigned.

Do not publish until the directory's current listing and spam rules, duplicate
entry status and permitted product links are confirmed.

## Technical newsletter or personal project site

**Angle:** moving an old open-source media converter toward shared React
contracts without pretending native and browser conversion have parity.
Link to the full source and specific tests; include a real screenshot
clearly labeled beta. This can be published on a personally controlled site
after fact-checking, without buying media or mailing unsolicited contacts.
