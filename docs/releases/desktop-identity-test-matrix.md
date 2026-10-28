# Desktop identity and migration test matrix

Acceptance plan for #92, written 2026-10-28 against `apps/desktop` version
`3.0.0-beta.2`. Source checks below are automated. **Every device result in this
document is pending**: no Honeymelon installer has been published or installed
on a physical machine for this record. Do not mark a cell passed from CI.

## Identity in source

The coexistence policy in
[ADR 0002](../architecture/0002-honeymelon-identity.md) requires every
OS-registered identifier to differ from Comet's.
`scripts/tests/desktop-identity.test.mjs` evaluates the real
`apps/desktop/forge.config.ts` and compares it with the ADR table.

| Surface                     | Comet (last release)                 | Honeymelon                                | Automated check                         |
| --------------------------- | ------------------------------------ | ----------------------------------------- | --------------------------------------- |
| Product / `app.name`        | `Comet`                              | `Honeymelon`                              | ADR table, `index.ts`                   |
| Executable                  | `Comet`, `Comet.exe`                 | `Honeymelon`, `Honeymelon.exe`            | Forge `executableName`, Squirrel `exe`  |
| macOS bundle ID             | `com.thavarshan.comet`               | `com.thavarshan.honeymelon`               | ADR table                               |
| Squirrel package name       | `Comet`                              | `Honeymelon`                              | Forge maker config                      |
| Squirrel setup filename     | `comet-<version>-<target>-setup.exe` | `honeymelon-<version>-<target>-setup.exe` | Both Windows targets                    |
| DEB/RPM package name, `bin` | `comet`, `Comet`                     | `honeymelon`, `Honeymelon`                | ADR table, Forge maker config           |
| Icons                       | Comet artwork                        | `assets/icons/icon.{icns,ico,png}`, setup | Files exist                             |
| User-data directory         | `Comet` (or `comet`)                 | `Honeymelon`, set explicitly before ready | ADR table, `index.ts`                   |
| Legacy import sources       | —                                    | `Comet`, then `comet`                     | `migrate-profile.ts`                    |
| Release asset prefix        | `comet-<version>-<target>-…`         | `honeymelon-<version>-<target>-…`         | Six targets, unique, download-safe      |
| URL protocol / file types   | None declared                        | None declared                             | Not applicable; confirm none registered |
| Auto-updater                | None in v2.2.3 or v3.0.0-beta.1      | None                                      | `git grep autoUpdater` (manual)         |

Not set in source: **Windows AppUserModelID.** The main process never calls
`app.setAppUserModelId`. Squirrel creates Start menu and desktop shortcuts with
its own ID derived from the package and executable names. Whether the running
window groups with a pinned shortcut must be observed on Windows (row W-AUMID
below). Comet did not set one either, so this is not a regression.

## Preference import in source

`apps/desktop/src/main/migrate-profile.ts` runs before preferences load, except
under `HONEYMELON_TEST_USER_DATA`. Unit tests in
`apps/desktop/src/main/migrate-profile.test.ts` cover:

| Property              | Evidence in tests                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Idempotent            | Second run returns `existing`; concurrent runs publish once.                                                             |
| Non-destructive       | Source bytes unchanged after import; invalid source unchanged, including `mtime`.                                        |
| Collision-safe        | Existing Honeymelon preferences win; exclusive staging plus hard-link publish.                                           |
| Bounded and validated | Malformed, oversized (> 1 MiB) and symbolic-link sources are ignored.                                                    |
| Fallback order        | `Comet` first, then `comet`; an invalid `Comet` file falls through to a valid `comet` one (case-sensitive file systems). |
| No residue            | No `.import-*` staging directory remains after import.                                                                   |
| Scope                 | Only `preferences-v1.json`; job lists are not copied.                                                                    |

Two behaviors to confirm on devices rather than assume:

- Deleting the Honeymelon preference file while a Comet profile exists causes
  the next launch to import Comet's settings again. This is by design; there is
  no in-app reset that would trigger it.
- A crash between staging and publishing can leave an empty `.import-*`
  directory in the Honeymelon profile. It is harmless and is not cleaned later.

Upgrade sources differ by Comet version:

| Installed Comet | Where settings live                   | Expected Honeymelon result                     |
| --------------- | ------------------------------------- | ---------------------------------------------- |
| v2.2.3 (stable) | Renderer browser storage (Vue/Pinia)  | Defaults; Comet profile left untouched         |
| v3.0.0-beta.1   | `<appData>/Comet/preferences-v1.json` | Language, theme, formats, destination imported |
| Neither         | —                                     | Defaults (`absent`)                            |

## Scenarios

Run each in a disposable VM or a dedicated test account. **Never rehearse
uninstall against a real user profile.** Keep a copy of every Comet profile
before starting.

| ID  | Scenario                    | Steps and pass criteria                                                                                                                                                                                                         |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | Fresh install               | No Comet present. Install, launch from the OS launcher, convert one video, audio and image file, quit, relaunch. Settings persist; queue starts empty.                                                                          |
| S2  | Upgrade from v2.2.3         | Install Comet v2.2.3, change settings. Install Honeymelon. Both apps present; Honeymelon starts with defaults; Comet still launches with its settings.                                                                          |
| S3  | Upgrade from v3.0.0-beta.1  | Install Comet beta.1, set non-default language, theme, formats and destination. Install Honeymelon. Settings imported; Comet's `preferences-v1.json` byte-identical (compare SHA-256 before/after).                             |
| S4  | Parallel install and run    | Comet and Honeymelon installed together. Launch both at once. Distinct Dock/taskbar/menu entries, icons and names; changing one app's settings does not change the other's.                                                     |
| S5  | Uninstall and reinstall     | Uninstall Honeymelon only. Comet, its shortcuts and its profile remain. Record whether the Honeymelon profile is kept. Reinstall; record whether settings return or re-import.                                                  |
| S6  | Downgrade / rollback        | With both installed after S3, quit Honeymelon and reopen Comet: original settings intact. Uninstall Honeymelon; Comet unaffected. Honeymelon-to-older-Honeymelon downgrade is not testable until two Honeymelon releases exist. |
| S7  | Existing Honeymelon profile | Seed a Honeymelon `preferences-v1.json`, keep a differing Comet one. Launch. Honeymelon's file is unchanged (no import).                                                                                                        |

Platform-specific rows:

| ID      | Platform | Check                                                                                                                                                        |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M-SIGN  | macOS    | `codesign -dv --verbose=4` shows `Identifier=com.thavarshan.honeymelon` and expected TeamIdentifier; `spctl -a -vv` and `stapler validate` results recorded. |
| M-TCC   | macOS    | File-access and keychain prompts on first conversion recorded; Comet's existing grants unaffected (permissions are per bundle ID).                           |
| W-SQ    | Windows  | Installs to a `Honeymelon` folder under `%LOCALAPPDATA%`, separate from `Comet`; Apps & features lists both; uninstalling one leaves the other's shortcuts.  |
| W-AUMID | Windows  | Pin the Start menu shortcut, launch: the running window groups with the pinned icon. Record the observed behavior.                                           |
| W-SIGN  | Windows  | `Get-AuthenticodeSignature` on setup and `Honeymelon.exe` shows the expected thumbprint; SmartScreen prompt text recorded.                                   |
| L-PKG   | Linux    | `dpkg -L honeymelon` / `rpm -ql honeymelon` share no path with the `comet` package; both install together; desktop entry, icon and launcher work.            |
| L-RM    | Linux    | `apt remove honeymelon` / `dnf remove honeymelon` leaves `comet` and `~/.config/Comet` intact. Portable tar launches with executable mode preserved.         |

## Matrix

Record for every cell: tester, date, OS build, exact downloaded asset name, its
SHA-256 matched against `SHA256SUMS`, result (pass / fail / blocked) and a link
to screenshots or logs. ARM64 hardware that is unavailable stays **blocked**
with the reason; it is not inferred from x64.

| Target       | Format         | S1      | S2      | S3      | S4      | S5      | S6      | S7      | Platform rows                  | Evidence |
| ------------ | -------------- | ------- | ------- | ------- | ------- | ------- | ------- | ------- | ------------------------------ | -------- |
| darwin-arm64 | ZIP            | pending | pending | pending | pending | pending | pending | pending | M-SIGN, M-TCC: pending         | —        |
| darwin-x64   | ZIP            | pending | pending | pending | pending | pending | pending | pending | M-SIGN, M-TCC: pending         | —        |
| win32-x64    | Squirrel setup | pending | pending | pending | pending | pending | pending | pending | W-SQ, W-AUMID, W-SIGN: pending | —        |
| win32-x64    | Portable ZIP   | pending | pending | pending | pending | n/a     | pending | pending | W-SIGN: pending                | —        |
| win32-arm64  | Squirrel setup | pending | pending | pending | pending | pending | pending | pending | W-SQ, W-AUMID, W-SIGN: pending | —        |
| win32-arm64  | Portable ZIP   | pending | pending | pending | pending | n/a     | pending | pending | W-SIGN: pending                | —        |
| linux-x64    | DEB            | pending | pending | pending | pending | pending | pending | pending | L-PKG, L-RM: pending           | —        |
| linux-x64    | RPM            | pending | pending | pending | pending | pending | pending | pending | L-PKG, L-RM: pending           | —        |
| linux-x64    | Portable tar   | pending | pending | pending | pending | n/a     | pending | pending | L-RM (tar): pending            | —        |
| linux-arm64  | DEB            | pending | pending | pending | pending | pending | pending | pending | L-PKG, L-RM: pending           | —        |
| linux-arm64  | RPM            | pending | pending | pending | pending | pending | pending | pending | L-PKG, L-RM: pending           | —        |
| linux-arm64  | Portable tar   | pending | pending | pending | pending | n/a     | pending | pending | L-RM (tar): pending            | —        |

`n/a`: portable builds have no uninstaller; re-extracting one is covered by S1
and S6.

## Signing and notarization

- `releaseRequiresSigning` exempts only `3.0.0-beta.1`. Version `3.0.0-beta.2`
  and later fail release verification on macOS and Windows without signatures.
  Missing credentials block the release; they do not downgrade it to unsigned.
- macOS: the new bundle ID needs a Developer ID signature and a new notarization
  ticket. Gatekeeper and privacy permissions treat Honeymelon as a different app
  from Comet. Forge signs and notarizes only when `APPLE_IDENTITY` is set;
  `verify-packaged.mjs` checks the TeamIdentifier when signing is expected.
- Windows: Squirrel setup and portable executables are signed when
  `WINDOWS_CERTIFICATE_FILE` is set; `verify-packaged.mjs` checks the expected
  thumbprint. SmartScreen behavior for the new filenames must be observed.
- Linux: DEB/RPM are not code-signed. Integrity relies on `SHA256SUMS` from the
  same GitHub release.
- Credentials were not available to this record; no signing check has run for
  Honeymelon artifacts.

## Release artifacts and legacy downloads

`scripts/prepare-release.mjs` names every asset
`honeymelon-<version>-<target>-<maker filename>` and fails on duplicates.
Published Comet releases keep their original names and digests, for example
`comet-2.2.3-x64-setup.exe` in v2.2.3 and
`comet-3.0.0-beta.1-win32-x64-…-setup.exe` in v3.0.0-beta.1; both releases are
reachable through the renamed repository (checked 2026-10-28, see the
[name decision record](../branding/name-decision-record.md)).

## Open before #92 can close

- [ ] Every matrix cell above recorded with evidence, or explicitly removed from
      the supported matrix by the owner.
- [ ] Signing credentials configured and M-SIGN/W-SIGN observed.
- [ ] W-AUMID observed; set an explicit AppUserModelID only if grouping fails.
- [ ] Desktop `homepage` (`https://honeymelon.app`) resolves, or is changed to
      the working origin before publication; it currently does not resolve.
