# Rebrand rollback runbook

Phased recovery for the Honeymelon cutover (#95), written 2026-10-28. It covers
the static site and DNS, published desktop artifacts, and the desktop identity.
Each phase is independent; roll back only the layer that failed. Nothing here
deletes user data or rewrites published history.

**Rehearsal status:** none of these procedures has been rehearsed for this
record. Rehearsals are logged at the end; #95 stays open until the site and
test-artifact rows are filled with real evidence.

## Phase 0 — stop and decide

1. Stop further publication: do not dispatch site deploys, push `v*` tags or
   edit releases until the incident owner says so.
2. Record what is live: `deployment.json` on both site hosts, the latest GitHub
   release and its asset list, and the time the problem was first seen.
3. Identify the failing layer and use only that phase:

| Symptom                                                     | Phase |
| ----------------------------------------------------------- | ----- |
| Site page, metadata, download selection or headers wrong    | 1     |
| Custom domain, TLS or legacy host misrouting                | 2     |
| Bad, unsigned, mismatched or mislabeled release asset       | 3     |
| Installed app loses settings, breaks Comet, or misregisters | 4     |

## Phase 1 — static site (Cloudflare Workers)

The site is two assets-only Workers, `honeymelon-site-preview` and
`honeymelon-site`, with no mutable data. Rollback restores a stored Cloudflare
version; it does not rebuild.

### 1a. Find the version to restore

From an authenticated operator shell (or the Worker's Deployments page in the
Cloudflare dashboard), list versions and pick the last known-good UUID:

```sh
npm exec -w @honeymelon/site -- wrangler deployments list --env production
```

Use `--env preview` for preview. Note the current UUID as well so the rollback
can itself be reversed.

### 1b. Roll back through GitHub Actions (preferred)

`.github/workflows/site-deploy.yml` (**Deploy static site**) supports this:

1. Actions → **Deploy static site** → **Run workflow**, branch `main`.
2. Inputs: `environment` = `preview` or `production`; `operation` = `rollback`;
   `version_id` = the full UUID from 1a.
3. The `admission` job runs `apps/site/scripts/deployment-policy.mjs`. It
   rejects the run unless the repository is `Thavarshan/honeymelon`, the ref is
   `refs/heads/main`, `version_id` is a UUID, the matching
   `HONEYMELON_SITE_*_URL` variable is set to a real host, and preview and
   production origins differ. It also requires the **current `main` head
   commit** to have successful `required` and `verify / security / codeql`
   checks (and `CodeQL` when present), with no failed or cancelled check.
4. The `build` job is skipped for rollback.
5. The `publish` job waits for the `site-preview` or `site-production` GitHub
   environment (approve it if reviewers are configured), then runs
   `wrangler rollback "$DEPLOY_VERSION" --env "$DEPLOY_TARGET" --yes` with that
   environment's `CLOUDFLARE_API_TOKEN`.
6. It then runs `verify-deployment.mjs` against the live URL with an **empty
   revision**, so routes, headers, indexing and cache rules are checked, but the
   restored source revision is not. Check it yourself:

```sh
curl -sS https://honeymelon-site.tjthavarshan.workers.dev/deployment.json
```

The workflow's concurrency group is `site-<environment>` without cancellation,
so a rollback queues behind an in-progress deploy to the same environment.

### 1c. Local fallback

Use this when admission cannot pass, for example because the `main` head commit
has a failing check:

```sh
npm exec -w @honeymelon/site -- wrangler rollback VERSION_UUID --env production --yes
node apps/site/scripts/verify-deployment.mjs "$HONEYMELON_SITE_PRODUCTION_URL" production
```

Use a Worker-scoped token, never a zone, DNS or billing token. If the needed
version is no longer retained by Cloudflare, check out a known-good commit and
redeploy it deliberately (see [site deployment](site-deployment.md)).

### 1d. Legacy Workers

`comet-site` and `comet-site-preview` are separate Workers outside this
workflow. #93 recorded their redirect deployments as
`4dbfc7aa-879d-49bf-b850-1a2f4ebef3e5` (production) and
`2ea96f86-3564-45df-b7c8-28760ca0dd14` (preview), with earlier versions kept in
Cloudflare history. Roll them back only from the Cloudflare dashboard or an
authenticated `wrangler rollback` for that Worker name. On 2026-10-28 both
returned `404` with `error code: 1042` instead of redirecting (see the
[name decision record](../branding/name-decision-record.md)); fix that before
relying on them as a rollback target. On 2026-10-29 the owner decided to retire
both; they are no longer a rollback target. Delete them with an authenticated
`wrangler delete --name comet-site` and
`wrangler delete --name comet-site-preview`.

## Phase 2 — custom domain and DNS

As of 2026-10-28 no custom domain is attached: `honeymelon.app` does not resolve
(lame Cloudflare delegation; registration expires 2026-11-03) and
`comet.thavarshan.com` is NXDOMAIN. There is no DNS state to roll back today. On
2026-10-29 the owner decided not to renew `honeymelon.app`; the `workers.dev`
origins are the canonical addresses, and desktop metadata points at the site
origin.

When a custom domain is attached later:

1. Before the change, export the zone's records and note the production Worker
   version and the `HONEYMELON_SITE_PRODUCTION_URL` value.
2. To roll back, remove the Worker custom-domain or route binding, restore the
   exported records, and set `HONEYMELON_SITE_PRODUCTION_URL` back to
   `https://honeymelon-site.tjthavarshan.workers.dev`.
3. Canonical URLs and the sitemap are baked in at build time, so a changed
   origin needs a **deploy** from `main`, not a Phase 1 rollback.
4. The workers.dev origin stays enabled throughout as the fallback host.

## Phase 3 — desktop release artifacts

`.github/workflows/release.yml` creates a draft, uploads every verified asset
plus `SHA256SUMS`, then publishes. It refuses to modify an already-published
release, and tags are never reused.

**Before publication** (the run failed or was stopped while the release is a
draft): no user can see it. Leave it as evidence or delete it with
`gh release delete vX.Y.Z` after recording why. Keep the tag unless it points at
the wrong commit; a replacement build always gets a new version.

**After publication:**

1. Restore the previous default download. For a stable release, mark the last
   good stable release latest again, for example
   `gh release edit v2.2.3 --latest`. For a prerelease, the site's stable
   channel is unaffected.
2. Mark the bad release clearly: `gh release edit vX.Y.Z --prerelease` and add a
   warning to its notes. Do not replace assets in place; checksums users already
   verified must stay true.
3. Remove assets only for a security or legal reason, and say so in the notes.
4. Refresh the site's release snapshot (Release Center operations) through a
   reviewed PR, then deploy it; or roll the site back (Phase 1) to a version
   built before the bad release appeared.
5. Ship the fix as a new version through the normal release workflow.

Published Comet releases (`v2.2.3`, `v3.0.0-beta.1`) are not touched by any of
these steps and remain the legacy fallback.

Rehearse with **test artifacts only**: run the release workflow in a fork with a
throwaway tag, or exercise the draft path and delete the draft. Never push a
rehearsal tag to `Thavarshan/honeymelon`.

## Phase 4 — application identity

Honeymelon installs beside Comet and never modifies Comet's profile
([ADR 0002](../architecture/0002-honeymelon-identity.md)). Rolling back is a
user-level action; the source identity is **not** reverted, because a renamed
"Comet" build would collide with existing Comet installs and profiles.

For an affected user:

1. Quit Honeymelon and open Comet; its settings are unchanged.
2. If Comet was removed, reinstall it from the
   [v2.2.3](https://github.com/Thavarshan/honeymelon/releases/tag/v2.2.3) or
   [v3.0.0-beta.1](https://github.com/Thavarshan/honeymelon/releases/tag/v3.0.0-beta.1)
   release and verify the file against that release's checksum.
3. Optionally uninstall Honeymelon (macOS: move `Honeymelon.app` to the Trash;
   Windows: Apps & features → Honeymelon; Linux: `apt remove honeymelon` or
   `dnf remove honeymelon`). Comet is not affected.
4. If only Honeymelon's imported settings are wrong, quit it and delete its
   `preferences-v1.json`; the next launch imports from Comet again.

| OS      | Honeymelon profile                                  | Comet profile (never changed)         |
| ------- | --------------------------------------------------- | ------------------------------------- |
| macOS   | `~/Library/Application Support/Honeymelon`          | `~/Library/Application Support/Comet` |
| Windows | `%APPDATA%\Honeymelon`                              | `%APPDATA%\Comet`                     |
| Linux   | `$XDG_CONFIG_HOME/Honeymelon` (default `~/.config`) | `$XDG_CONFIG_HOME/Comet` (or `comet`) |

For the project: stop distributing the faulty build (Phase 3), file the defect
with the identity-matrix row that failed, and fix forward.

## Rehearsal log

| Date | Procedure                                    | Environment   | Version UUIDs / tag | Result  | Evidence |
| ---- | -------------------------------------------- | ------------- | ------------------- | ------- | -------- |
| —    | Phase 1b workflow rollback and re-deploy     | site preview  | —                   | pending | —        |
| —    | Phase 1c local rollback                      | site preview  | —                   | pending | —        |
| —    | Phase 3 draft discard with test artifacts    | fork          | —                   | pending | —        |
| —    | Phase 4 reopen Comet after Honeymelon import | disposable VM | —                   | pending | —        |
