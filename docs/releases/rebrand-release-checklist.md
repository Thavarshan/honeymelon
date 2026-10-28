# Rebrand release checklist

Repeatable go/no-go record for the first Honeymelon desktop release and any
release that changes identity, packaging or public links (#95). Copy this file
to `docs/releases/<version>-acceptance.md` for each candidate and fill it in.
Every field takes **pass**, **fail** or **blocked** plus an evidence link. An
empty field is a fail. CI results never stand in for a device result.

## Candidate

| Field                   | Value |
| ----------------------- | ----- |
| Desktop version / tag   |       |
| Source commit           |       |
| Release workflow run    |       |
| Release manager, date   |       |
| Channel (beta / stable) |       |

## 1. Automated gates

| Gate                                                        | What it proves                                                                               | Result | Evidence |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------ | -------- |
| `npm run test:ci`                                           | Branding, desktop identity vs ADR 0002, icons, artifact naming, release and signing policy   |        |          |
| `npm test -w @honeymelon/desktop`                           | Preference import idempotence, precedence and safety; IPC and renderer behavior              |        |          |
| `npm run format:check`, `npm run lint`, `npm run typecheck` | Source quality gate                                                                          |        |          |
| Release workflow `verify` on the tag: six native targets    | Packaged app launches and converts on CI runners; receipts match version, commit and digests |        |          |
| Eleven Linux distribution jobs                              | Packaged app in named container distributions under Xvfb                                     |        |          |
| Exhaustive conversion-pair matrix                           | Advertised conversions on each runner; documented fixture gaps (AMR, APE, MPC) excluded      |        |          |
| CodeQL and `verify / security / codeql`                     | No blocking security findings                                                                |        |          |
| `releaseRequiresSigning(version)` is `true`                 | Only `3.0.0-beta.1` was exempt; this release must be signed on macOS and Windows             |        |          |

## 2. Per-target compatibility

Detailed scenarios and their evidence columns are in the
[desktop identity test matrix](desktop-identity-test-matrix.md). Summarize the
result here; link the matrix rows.

| Target       | CI receipt `passed` | Signed and verified | Fresh install (S1) | Upgrade from Comet (S2/S3) | Parallel (S4) | Uninstall/reinstall (S5) | Rollback to Comet (S6) | Real conversions | Evidence |
| ------------ | ------------------- | ------------------- | ------------------ | -------------------------- | ------------- | ------------------------ | ---------------------- | ---------------- | -------- |
| darwin-arm64 |                     |                     |                    |                            |               |                          |                        |                  |          |
| darwin-x64   |                     |                     |                    |                            |               |                          |                        |                  |          |
| win32-x64    |                     |                     |                    |                            |               |                          |                        |                  |          |
| win32-arm64  |                     |                     |                    |                            |               |                          |                        |                  |          |
| linux-x64    |                     | n/a (checksum only) |                    |                            |               |                          |                        |                  |          |
| linux-arm64  |                     | n/a (checksum only) |                    |                            |               |                          |                        |                  |          |

"Real conversions" means at least one video, audio and image file converted,
cancelled and retried from the installed app, with output opened in another
program.

## 3. Artifacts and downloads

| Check                                                                              | Command or method                                                                        | Result | Evidence |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------ | -------- |
| Release is published, not draft                                                    | `gh release view vX.Y.Z --json isDraft,isPrerelease`                                     |        |          |
| Every asset is `honeymelon-<version>-<target>-…`; 12 binaries plus `SHA256SUMS`    | `gh release view vX.Y.Z --json assets --jq '.assets[].name'`                             |        |          |
| Each downloaded asset matches its exact `SHA256SUMS` row                           | `grep -F '  NAME' SHA256SUMS \| sha256sum -c -`                                          |        |          |
| Every asset URL downloads                                                          | `curl -sSIL -o /dev/null -w '%{http_code}\n' URL` returns `200`                          |        |          |
| Legacy releases intact: v2.2.3 and v3.0.0-beta.1 asset names and digests unchanged | Compare `gh release view` output with the previous record                                |        |          |
| Old repository URLs redirect                                                       | `curl -sSI https://github.com/Thavarshan/comet` returns `301` to `Thavarshan/honeymelon` |        |          |
| Site `/download/` offers this release for each OS/architecture, and no draft asset | Manual check on the production URL after a snapshot refresh and deploy                   |        |          |
| Site deploy verifier passes                                                        | `node apps/site/scripts/verify-deployment.mjs <url> production <sha>`                    |        |          |
| Legacy Workers redirect (`comet-site`, `comet-site-preview`, paths preserved)      | `curl -sSI https://comet-site.tjthavarshan.workers.dev/download/` returns `301`          |        |          |
| Desktop `homepage` resolves over valid TLS                                         | `curl -sSI https://honeymelon.app/` (or the origin the metadata was changed to)          |        |          |

## 4. Claims, privacy and licensing

| Check                                                                                                                       | Result | Evidence |
| --------------------------------------------------------------------------------------------------------------------------- | ------ | -------- |
| Desktop makes no network requests: no telemetry, updater or analytics added (source review of `apps/desktop/src`)           |        |          |
| Site and release notes describe local processing accurately; no claim of a browser converter that is not deployed           |        |          |
| Release notes say Honeymelon installs beside Comet and which settings import                                                |        |          |
| MIT license, third-party and FFmpeg notices included in the packaged app; [provenance](../branding/provenance.md) unchanged |        |          |
| Cloudflare account still on the Free plan with no added bindings or scripts                                                 |        |          |
| [Name decision record](../branding/name-decision-record.md) open items resolved or accepted by the owner for this channel   |        |          |

## 5. Rollback readiness

| Check                                                                                     | Result | Evidence |
| ----------------------------------------------------------------------------------------- | ------ | -------- |
| Known-good production and preview site version UUIDs recorded                             |        |          |
| Site rollback rehearsed on preview ([runbook](../operations/rollback-runbook.md) Phase 1) |        |          |
| Test-artifact release rollback rehearsed (runbook Phase 3)                                |        |          |
| Previous latest stable release noted for `gh release edit --latest` restore               |        |          |

## No-go criteria

Any one of these stops the release. Do not publish, promote or announce until it
is fixed and the affected section is re-run.

1. Any supported target lacks a passing native receipt, or a target is dropped
   without an explicit owner decision recorded here.
2. A macOS or Windows artifact is unsigned, or its signer or TeamIdentifier is
   not the expected one. Missing credentials are a no-go, not an exception.
3. Any upgrade test loses, alters or overwrites Comet preferences, or imports
   settings over an existing Honeymelon profile.
4. Installing or uninstalling Honeymelon removes, breaks or relabels Comet, its
   shortcuts, its package or its profile.
5. An asset name, digest or `SHA256SUMS` row mismatches; or the workflow would
   replace a published release.
6. A previously working public link (repository, release, asset or site route)
   returns an error.
7. Desktop metadata points at a domain that does not resolve with valid TLS.
8. A privacy or capability claim is inaccurate.
9. Rollback for the site has not been rehearsed, or the known-good version UUID
   is unknown.
10. For a **stable** release: formal trademark review not completed or not
    accepted by the owner.

## Sign-off

| Role          | Name | Date | Decision (go / no-go) |
| ------------- | ---- | ---- | --------------------- |
| Release owner |      |      |                       |
| Project owner |      |      |                       |
