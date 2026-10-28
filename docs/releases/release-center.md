# Release Center operations

The Release Center delivered under closed issue #71 serves a checked JSON
snapshot in the static site export. Site deployment to Cloudflare remains a
separate open milestone (#72). Visitors never call GitHub's API, upload media,
or receive an API token. `@honeymelon/contracts` owns the public types;
`@honeymelon/ui` supplies buttons, badges and the native select shared across
the monorepo. Turbo builds these packages before the site and runs the site
tests through the existing verification jobs.

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

Browser client hints or UA suggest only the OS. Neither an Intel-looking Mac UA
nor Windows' emulation UA establishes CPU architecture. Users explicitly choose
x64 or ARM64 and a published package format. Linux distribution/package
preferences are never inferred. A unique matching asset is required for the
primary CTA; no automatic download occurs. The all-assets disclosure and
original GitHub release links also work without JavaScript.

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
token isolation. Playwright checks direct Windows ARM and Apple Silicon CTA
URLs, channel separation, keyboard controls, mobile overflow and axe on every
public route. Review the screenshot/axe artifacts from CI before merging.
