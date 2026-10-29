# Brand decision record: Comet or Honeymelon

Evidence for #87, recorded 2026-10-28. This is an engineering due-diligence
record, **not legal advice and not a trademark clearance opinion**. It records
what was checked, how, and what remains open.

## Decision

**Go: use Honeymelon.** The owner approved the complete Comet-to-Honeymelon
transition on 20 October 2026, superseding the 18 October deferral:

- Deferral: [#86 comment, 2026-10-18][deferral] — "keep Comet and defer".
- Approval: [#86 body][parent], "Approved on 20 October 2026: the owner
  explicitly requested the complete Comet-to-Honeymelon transition".
- Delivery: [#129] source rename, then the [#86 comment, 2026-10-20][delivered]
  recording CI, live Workers and the remaining gates.

The go decision covers the product name and the technical identities in
[ADR 0002](../architecture/0002-honeymelon-identity.md). It does not by itself
authorize a desktop release, DNS change, paid registration or store listing.
Those remain gated by the open items below and by the
[rebrand release checklist](../releases/rebrand-release-checklist.md).

## Options compared

| Factor             | Retain Comet                                                                                                                                              | Restore Honeymelon (chosen)                                                                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name collisions    | Crowded. Homebrew cask `comet` is Perplexity's AI web browser; npm `comet` is an unrelated long-polling library. "Comet" is also a generic web-push term. | No Homebrew, Snap, Flathub, winget or npm package named `honeymelon` found. Main known collision is the separate historical Honeymelon project (see conflicts).                  |
| Search visibility  | Existing pages and links, but competes with a heavily promoted browser of the same name. Legacy `comet.thavarshan.com` no longer resolves.                | New name starts with little ranking; distinctive enough to own results once indexed. Common fruit term ("honey melon") dilutes exact-match queries.                              |
| Existing users     | No change. v2.2.3 is the latest stable release and keeps working.                                                                                         | New identity installs alongside Comet; versioned v3 preferences are imported, not moved. Pre-v3 browser-storage settings are not imported (ADR 0002).                            |
| Prior app identity | `com.thavarshan.comet`, `Comet.exe`, `comet` packages stay.                                                                                               | `com.thavarshan.honeymelon`, `Honeymelon.exe`, `honeymelon` packages are new OS registrations. Requires per-OS signing and installer acceptance before release.                  |
| Redirects          | None needed.                                                                                                                                              | GitHub redirects `Thavarshan/comet` (checked below). Old Workers hosts were meant to 301 but return 404 today. `comet.thavarshan.com` is not resolvable. `honeymelon.app` fails. |
| Trademark risk     | Not assessed; the crowded field suggests higher confusion risk in software.                                                                               | Not formally assessed. The historical project's NOTICE records the author's trademark claim; ownership and scope of that claim need confirmation.                                |
| Cost               | None.                                                                                                                                                     | None so far. `honeymelon.app` renewal is due 2026-11-03 and is a paid action (blocker, not purchased).                                                                           |

## Dated checks (2026-10-28, from WSL Ubuntu, UTC)

Commands were run from the repository root. Results are reproduced verbatim or
summarized without changing their meaning. Re-run before relying on them.

### Domains and DNS

| Command                                                                  | Result                                                                                                                                                                              |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getent hosts honeymelon.app`                                            | No result (exit 2).                                                                                                                                                                 |
| `curl -sS 'https://dns.google/resolve?name=honeymelon.app&type=A'`       | `Status: 2` (SERVFAIL); "Name servers refused query (lame delegation?)". Every Cloudflare nameserver answered `REFUSED` for A, AAAA, NS, SOA and CNAME.                             |
| `curl -sS https://pubapi.registry.google/rdap/domain/honeymelon.app`     | Registered 2025-11-03 via Namecheap Inc.; **expires 2026-11-03T23:01:55Z**; nameservers `dimitris.ns.cloudflare.com`, `tia.ns.cloudflare.com`; status `client transfer prohibited`. |
| `curl -sSI --max-time 10 https://honeymelon.app/`                        | `curl: (6) Could not resolve host: honeymelon.app`.                                                                                                                                 |
| `getent hosts comet.thavarshan.com`                                      | No result (exit 2).                                                                                                                                                                 |
| `curl -sS 'https://dns.google/resolve?name=comet.thavarshan.com&type=A'` | `Status: 3` (NXDOMAIN). Authority: SOA of `thavarshan.com` on `dimitris.ns.cloudflare.com`.                                                                                         |
| `curl -sSI --max-time 10 https://comet.thavarshan.com/`                  | `curl: (6) Could not resolve host: comet.thavarshan.com`.                                                                                                                           |
| `curl -sS https://rdap.verisign.com/com/v1/domain/thavarshan.com`        | Registered 2023-05-18 via NameCheap, Inc.; expires 2027-05-18; same Cloudflare nameserver pair. `thavarshan.com` itself resolves.                                                   |

`honeymelon.app` delegates to the same Cloudflare nameserver pair as
`thavarshan.com`, but those nameservers refuse to answer for it. That pattern is
consistent with a zone that is not active in Cloudflare. It does not prove who
controls the registration: registrant data is redacted, and #86 records that the
authenticated Cloudflare account has no accessible `honeymelon.app` zone.

### Live Workers URLs

| Command                                                                                                        | Result                                                                                                    |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `curl -sSI https://honeymelon-site.tjthavarshan.workers.dev/`                                                  | `HTTP/2 200`.                                                                                             |
| `curl -sS https://honeymelon-site.tjthavarshan.workers.dev/deployment.json`                                    | `production`, revision `346db5bfb5d71598663219df6e03c43eb94ee39e`, canonical origin is the same host.     |
| `curl -sSI https://honeymelon-site-preview.tjthavarshan.workers.dev/`                                          | `HTTP/2 200`, `x-robots-tag: noindex, nofollow`; `deployment.json` revision `346db5b…`, canonical `null`. |
| `/download/`, `/privacy/`, `/og-honeymelon.png` on production                                                  | `200` each; `/does-not-exist/` returns `404`.                                                             |
| `curl -sSI https://comet-site.tjthavarshan.workers.dev/` (also `/download/`, `/og-comet.png`, `/og-comet.svg`) | **`HTTP/2 404`, `text/plain`, body `error code: 1042`**. No `location` header.                            |
| `curl -sSI https://comet-site-preview.tjthavarshan.workers.dev/` (also `/download/`)                           | **`HTTP/2 404`, body `error code: 1042`**.                                                                |
| `curl -sSI https://github.com/Thavarshan/comet`                                                                | `HTTP/2 301` to `https://github.com/Thavarshan/honeymelon`.                                               |
| `curl -sSI https://github.com/Thavarshan/comet/releases/tag/v2.2.3`                                            | `HTTP/2 301` to `…/Thavarshan/honeymelon/releases/tag/v2.2.3`.                                            |

The [#93 comment of 2026-10-20][redirects] records verified 301 redirects from
both legacy Workers. They no longer redirect. A mirror of Cloudflare's Workers
error documentation describes 1042 as a Worker fetching another Worker on the
same zone; the cause here was not established from outside the account.
**Regression:** investigate with Cloudflare access before claiming legacy links
work (#93).

### GitHub names

| Command                              | Result                                                                                                                                  |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `gh api repos/Thavarshan/honeymelon` | Exists; created 2024-08-10 (the renamed Comet repository). Discussions **disabled** (`has_discussions: false`).                         |
| `gh api repos/Thavarshan/comet`      | Resolves to `Thavarshan/honeymelon` (rename redirect).                                                                                  |
| `gh api users/honeymelon`            | **Taken**: user `HoneyMelon` ("Valentina Vef"), created 2019-02-25, three unrelated public repositories.                                |
| `gh api orgs/honeymelon`             | 404 — the login is a user, not an organization, so an org of that name is unavailable.                                                  |
| `gh api users/honeymelon-app`        | **Exists**: organization "Honeymelon", created 2025-11-01, zero public repositories. Controller not determinable here.                  |
| `gh api users/honeymelonapp`         | 404 (no account of that name at check time; availability for registration not tested).                                                  |
| `gh search repos honeymelon`         | `Thavarshan/honeymelon`; `whiskey-dreams/honeymelon` (see conflicts); `Volchyara/honeymelon.io`, `yuriyteplyakov/*` (empty, unrelated). |

No GitHub organization is required: the product stays under `Thavarshan`.

### Package and store names

| Command                                                                    | Result                                                                                                                                                  |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm view honeymelon` / `honeymelon-desktop`                               | E404 (no package).                                                                                                                                      |
| `npm view @honeymelon/desktop` / `contracts` / `ui`                        | E404 (no package).                                                                                                                                      |
| `curl https://registry.npmjs.org/-/org/honeymelon/package`                 | `{}`, while a random nonexistent scope returns `Scope not found`. Inference: the `@honeymelon` scope **exists** with no public packages. Owner unknown. |
| `npm search` API, `text=honeymelon`                                        | `total: 0`.                                                                                                                                             |
| `curl https://formulae.brew.sh/api/cask/honeymelon.json` (and `/formula/`) | 404.                                                                                                                                                    |
| `curl https://formulae.brew.sh/api/cask/comet.json`                        | 200: "Comet — Web browser with integrated AI assistant", `perplexity.ai/comet`.                                                                         |
| Snap store `v2/snaps/info/honeymelon`                                      | 404.                                                                                                                                                    |
| Flathub search `honeymelon`                                                | `totalHits: 0`.                                                                                                                                         |
| `gh api 'search/code?q=honeymelon+repo:microsoft/winget-pkgs'`             | `0`.                                                                                                                                                    |

All nine workspaces are `"private": true`, so the occupied `@honeymelon` npm
scope does not block the build. Publishing any workspace to npm would.

### Web search for conflicting products

General web searches on 2026-10-28 for `Honeymelon app software`,
`"Honeymelon" media converter macOS` and
`"Honeymelon" trademark registration software class 9` returned no other
software product named Honeymelon. Results were dominated by the fruit, the
Honey shopping extension and HoneyBook. A general search engine is not a
trademark register search and can miss unindexed or regional uses.

## Known conflicts

1. **Historical Honeymelon project.** `whiskey-dreams/honeymelon` ("A simple
   MacOS Apple Silicon media converter"), GPL-3.0, homepage
   `https://honeymelon.app`, created 2026-02-06, contributors include
   `Thavarshan`. [Provenance](provenance.md) records a GPLv3 local archive whose
   NOTICE carries the author's trademark claim. Same name, same category, same
   intended domain. Its relationship to this project's owner must be stated by
   the owner; no code or artwork from it is used here.
2. **GitHub user `HoneyMelon`.** Unrelated individual. Blocks
   `github.com/honeymelon` as an organization name only.
3. **npm scope `@honeymelon`.** Exists, owner unknown. Blocks npm publication
   under that scope only.
4. **GitHub org `honeymelon-app`.** Named "Honeymelon", created two days before
   `honeymelon.app` was registered, empty. Owner unknown; confirm whether it is
   the owner's before linking to it.
5. **Retaining Comet** would share a name with Perplexity's Comet browser, which
   already holds the `comet` Homebrew cask.

## OPEN — requires human action

- [ ] **Formal trademark review.** Not done. Searches above are not a clearance.
      Before stable launch, search at least USPTO, EUIPO/TMview and WIPO Global
      Brand Database for HONEYMELON in Nice classes 9 and 42, and in any market
      of intended distribution. Escalate the historical project's trademark
      claim for proper review if its owner is not this project's owner.
- [ ] **`honeymelon.app` renewal — expires 2026-11-03.** Renewal is paid. This
      record identifies it as a **blocker, not purchased**. If it lapses, the
      desktop `homepage` metadata and planned canonical origin point at a domain
      the project may lose. Owner decides: renew, or move metadata to the
      working `honeymelon-site.tjthavarshan.workers.dev` origin before any
      release.
- [ ] **`honeymelon.app` zone access.** Delegated to Cloudflare but the zone is
      not served and is not visible in the authenticated account (#86, #93). Add
      the zone to the account that owns `thavarshan.com` (free plan), or change
      nameservers at the registrar, then validate TLS before use.
- [ ] **Legacy Workers redirects regressed** to 404 / error 1042 (see above).
- [ ] **`comet.thavarshan.com`** is NXDOMAIN. Decide whether to restore a
      redirect record in the `thavarshan.com` zone (free) or leave it retired.
      The old site repository `Thavarshan/comet.thavarshan.com` still exists.
- [ ] **Social handles** (X, Bluesky, Mastodon, Reddit, Product Hunt) were not
      checked: they require interactive or authenticated lookups. No account was
      registered.
- [ ] **App stores** (Mac App Store, Microsoft Store) were not checked; neither
      is a current distribution channel.
- [ ] **Confirm ownership** of `honeymelon-app` (GitHub) and `@honeymelon` (npm)
      if either will be referenced publicly.

No domain, handle, package or store name was registered, renewed or paid for
during these checks, and no DNS record was changed.

[parent]: https://github.com/Thavarshan/honeymelon/issues/86
[deferral]:
  https://github.com/Thavarshan/honeymelon/issues/86#issuecomment-6248536363
[delivered]:
  https://github.com/Thavarshan/honeymelon/issues/86#issuecomment-6281451123
[redirects]:
  https://github.com/Thavarshan/honeymelon/issues/93#issuecomment-6281450106
[#129]: https://github.com/Thavarshan/honeymelon/pull/129
