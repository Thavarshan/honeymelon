# ADR 0002: Honeymelon identity

Accepted by the project owner on 20 October 2026. Supersedes the earlier rebrand
deferral. The next desktop version is 3.0.0-beta.2.

## Active identity

| Surface                          | Previous             | Current                   |
| -------------------------------- | -------------------- | ------------------------- |
| Product and executable           | Comet                | Honeymelon                |
| Repository                       | Thavarshan/comet     | Thavarshan/honeymelon     |
| Workspace scope                  | @comet               | @honeymelon               |
| macOS bundle ID                  | com.thavarshan.comet | com.thavarshan.honeymelon |
| Linux package                    | comet                | honeymelon                |
| Renderer bridge                  | window.comet         | window.honeymelon         |
| Configuration environment prefix | COMET\_              | HONEYMELON\_              |
| User-data directory              | Comet                | Honeymelon                |

The shared UI uses the official shadcn Neutral light and dark tokens and
0.625rem base radius. Product pages inherit the same tokens. There is no custom
blue or amber brand palette.

## Installation and preferences

New identities intentionally coexist with older installations. A Honeymelon
installer does not uninstall Comet or overwrite its profile. This also avoids
mistaking an unsigned beta for a signed upgrade of the stable application.

At startup, before preferences load, desktop checks the platform application
data directory for `Comet/preferences-v1.json`, then the lowercase `comet`
variant. Only validated, regular, bounded-size preference files are imported. A
pre-existing Honeymelon preference file always takes precedence. Copying is
exclusive; the old file is never changed. Malformed files and symlinks are
ignored. Unexpected read/write errors remain visible during initialization.

Only versioned settings are copied. Cookies, caches, credentials and conversion
jobs are excluded. Restart begins with an empty queue. Pre-v3 installations that
stored settings only in browser localStorage require users to select settings
again; those browser profiles are retained unchanged.

For rollback, quit Honeymelon and reopen the previous application. Its original
profile remains available. Uninstalling either application must not remove the
other application's profile. Physical install, upgrade and uninstall behavior,
signing and notarization still require verification on each release target; unit
tests alone do not establish those outcomes.

## History and web cutover

Published tags, release notes, filenames and checksums remain immutable. The
release center labels older downloads as legacy builds. Existing release
filenames are not presented as newly branded binaries.

GitHub redirects the previous repository URL. Deployment uses the new
`honeymelon-site` and `honeymelon-site-preview` Workers names. Old public Worker
URLs should redirect only after the new deployment passes verification.

On 29 October 2026 the owner decided not to renew `honeymelon.app` (it expires 3
November 2026) and to retire the legacy `comet-site` Workers. The canonical
addresses are `honeymelon-site.tjthavarshan.workers.dev` and
`honeymelon-web.tjthavarshan.workers.dev`; desktop metadata points at the site.
A future custom domain would need a new zone; DNS is not changed by this source
migration. Name availability and trademark clearance are not implied by the
technical rename.

## Platform acceptance matrix

| Platform | Profile roots                                        | Required acceptance                                                |
| -------- | ---------------------------------------------------- | ------------------------------------------------------------------ |
| macOS    | `~/Library/Application Support/{Comet,Honeymelon}`   | ZIP install, bundle ID, coexistence, import, rollback, signing     |
| Windows  | `%APPDATA%\{Comet,Honeymelon}`                       | Squirrel install/uninstall, shortcut, independent profiles, import |
| Linux    | `$XDG_CONFIG_HOME/{Comet,Honeymelon}` or `~/.config` | DEB/RPM/portable install, independent profiles, import             |

Squirrel's application name and executable change from `Comet`/`Comet.exe` to
`Honeymelon`/`Honeymelon.exe`; its installation is a separate product. No custom
URL protocol, account database, telemetry service or updater is introduced.

For each platform: (1) retain a copy of old preferences, (2) install alongside
the old application, (3) verify imported language/theme/formats/destinations,
(4) complete and cancel real conversions, (5) restart and verify persistence,
(6) uninstall only the new application, and (7) reopen the old application and
compare the original settings. Test with both an existing new profile and a
clean profile. Never perform uninstall rehearsals against a real user profile.

Release is blocked by missing native packaged checks, signing credentials or
unverified installer behavior. A source merge does not publish a desktop
release. The existing release workflow remains the only publication path;
previous unsigned-beta exceptions do not authorize a new unsigned release.
