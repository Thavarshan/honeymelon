# Release Center operations

The Release Center delivered under closed issue #71 serves a checked JSON
snapshot in the static site export. Site deployment to Cloudflare remains a
separate open milestone (#72). Visitors never call GitHub's API, upload media,
or receive an API token. `@honeymelon/contracts` owns the public types;
`@honeymelon/ui` supplies the buttons, badges and cards shared across the
monorepo. Turbo builds these packages before the site and runs the site tests
through the existing verification jobs.

## Refresh and recovery

Run `node apps/site/scripts/refresh-releases.mjs` from the repository root using
the pinned Node version. An optional `GITHUB_TOKEN` stays in the API request
header only. The script paginates published releases, excludes drafts, validates
repository/tag/name/ID/state/size/digest, then checks each installer URL with
HEAD requests through a restricted GitHub redirect chain. It never proxies or
downloads binary contents. Reordered inputs produce the same sorted releases and
packages; only the verification timestamp changes.

The weekly/manual **Verify release manifest** workflow performs the same checks
with read-only permissions. Download its `verified-release-manifest` artifact,
review and replace `apps/site/src/data/releases.json`, run the site checks, then
commit it through a PR. Scheduled jobs deliberately do not push with a bot token
that could bypass normal CI. A fresh checked artifact is not a site deployment;
#72 owns Cloudflare publication.

Failure exits nonzero and atomically retains a revalidated previous snapshot,
its original verification time and its assets, marking `refreshFailed: true`.
First-run failure writes an empty fallback. The offline build preparation step
also supplies a safe empty snapshot if the cache is missing or damaged. The UI
always links official Releases, and shows a warning after a failed refresh or
seven days without verification. Do not manually change the timestamp to hide a
refresh failure. Malformed cached data is rejected; no arbitrary cached URLs
become CTAs.

## Platform and trust policy

Stable is the default channel. Prerelease flags and semantic-version suffixes
both prevent accidental stable promotion. Version ordering uses semver
precedence; duplicate versions fail validation. Updater feeds and nupkg files
are not installers. Unknown or conflicting filename tokens stay unknown.

The download page starts the latest **stable** package automatically when it can
identify exactly one, Apple style ("Your download will begin in 3 seconds", with
Cancel). Prereleases are never downloaded automatically. Matching lives in
`apps/site/src/lib/downloads.ts` and is unit tested against this snapshot:

- **OS** comes from `navigator.userAgentData.platform` or the user agent.
  Phones, iPadOS (a Mac user agent with touch points) and ChromeOS get no
  automatic download.
- **CPU** comes only from real signals: the `architecture` client hint
  (Chromium) or, on a Mac, an explicit WebGL renderer name (`Apple M…` means
  Apple silicon; Intel/AMD/NVIDIA means Intel). Safari reports every Mac GPU as
  "Apple GPU", and an Intel-looking Mac user agent proves nothing, so those Macs
  get a one-click chip choice, never a guess. Linux takes the architecture token
  from its user agent.
- **Windows without a CPU hint** (for example Firefox) gets the x64 installer.
  x64 runs on Windows 11 on ARM through emulation; Windows 10 on ARM cannot run
  it, which is the known limit of this default.
- **Linux packaging** is inferred only from a distribution token in the user
  agent (Ubuntu, Debian, Mint → .deb; Fedora, RHEL, SUSE → .rpm). Otherwise
  visitors choose with one click.

A download starts at most once per tab session (`sessionStorage`), and never
when the page is opened with `?auto=0` or any `#section` link. Every package of
every published version is also a plain link on the same page, grouped by
platform, with no selects or forms; it all works without JavaScript.

SHA-256 digests are shown only when published in GitHub's asset `digest` field,
with that provenance. Older assets without digests are marked unknown. Checksums
do not prove code signing or notarization. Minimum OS, signing and notarization
are not inferred from a filename or a digest; original notes are the source of
truth. Beta warnings reference the explicitly published v3.0.0-beta.1 notes.
Notes render as inert text, never untrusted HTML.

## Verification

Run `npm run test -w @honeymelon/site`, `npm run build:browser`,
`npm run test:site -- --project=site-chromium`, `npm run lint`, and
`npm run typecheck`. Unit tests exercise filenames, semver, trust validation,
rate limits, offline recovery, first-run fallback, redirect restrictions and
token isolation. Playwright drives the page as Windows (x64 and ARM), Apple
silicon and Intel Macs, Safari on a Mac, Ubuntu, generic Linux and an iPhone. It
checks the exact automatic download, that it happens once, Cancel, the opt-outs,
the no-forms library, keyboard access, mobile overflow and axe on every public
route. GitHub downloads are intercepted, so tests never fetch a package. Review
the screenshot/axe artifacts from CI before merging.
