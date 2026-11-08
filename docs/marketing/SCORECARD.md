# Honeymelon growth scorecard

**Observation (2026-11-09, Asia/Colombo):** [first measured snapshot](snapshots/2026-11-09.md). These figures are cumulative GitHub values **as observed**, not a count of active users or newly acquired users. No analytics, media upload tracking or product telemetry was installed.

## Verified day-zero snapshot

| Metric | Measured value | Source / limits |
| --- | ---: | --- |
| GitHub stars | 157 | [Repository API](https://api.github.com/repos/Thavarshan/honeymelon); interest signal |
| GitHub forks | 11 | Same repository API |
| Latest non-prerelease desktop | v2.2.3 | [Release API](https://api.github.com/repos/Thavarshan/honeymelon/releases/tags/v2.2.3) |
| Stable binary asset download events | 2,184 | Sum of 9 published binary assets at v2.2.3; excludes 17 `RELEASES` metadata downloads |
| Published unsigned desktop beta | v3.0.0-beta.1 | [Beta API](https://api.github.com/repos/Thavarshan/honeymelon/releases/tags/v3.0.0-beta.1) |
| Beta binary asset download events | 177 | Sum of 12 published beta binaries; excludes 3 `SHA256SUMS` downloads |
| Website visits/referral traffic | Unknown | No independently verified aggregate analytics access |
| First-time external accepted PR authors | Unknown | Needs author and merged-date cohort query |
| Actionable user feedback | Unknown | Manual review of substantive reports needed |

Collected via GitHub's public API at approximately **2026-11-08T19:52:39.404Z (UTC)**. Numbers can change immediately after collection. The counts are **lifetime per-asset download counters** for each release, not downloads since campaign start; one person downloading several assets counts several times. The stable release predates the campaign. They must **not** be used as marketing conversion or growth deltas.

For audits and complete per-asset values, see [the dated observation](snapshots/2026-11-09.md).

## Weekly reporting template

Use a new dated snapshot each week and update [the CSV ledger](snapshots/weekly.csv) rather than overwriting historical observations.

| Field | Value |
| --- | --- |
| Week ending (Asia/Colombo) | YYYY-MM-DD |
| Collection time and exact sources | Unknown |
| GitHub stars / change vs previous comparable snapshot | Unknown |
| Forks / change | Unknown |
| Stable binary asset download events / change | Unknown |
| Beta binary asset download events / change | Unknown |
| Accepted PRs from new external contributors | Unknown |
| Actionable user feedback | Unknown |
| Aggregate site visitors/referrers (if available) | Unknown |
| Tutorials / authentic community interactions | Unknown |
| Channels tried, what worked/failed | Unknown |
| Objections and evidence | Unknown |
| Next three actions | Unknown |

## UTM naming convention

Use UTMs **only** on future public landing-page links, with generic campaign tags and no names, emails, file identifiers, click IDs or other personal data.

Example:
`?utm_source=devto&utm_medium=community&utm_campaign=honeymelon_beta_2026&utm_content=architecture_story`.

- `utm_source`: lowercase channel identifier (`devto`, `github`, `show_hn`).
- `utm_medium`: `community`, `article`, or `directory`.
- `utm_campaign`: stable human-readable campaign slug.
- `utm_content`: short post/creative variant identifier, never user-specific.

Do not add analytics code just to collect these parameters. Without independently verified privacy-conscious aggregate analytics, referrals and attribution remain unknown.

## Working goals (targets, not forecasts)

- +100 stars above the **verified** 2026-11-09 baseline.
- 5 accepted PRs from external first-time contributors.
- 25 actionable reports.
- 500 *additional* eligible binary asset download events after the baseline, not users or installs.
- 12 useful articles/tutorials; 10 venue-appropriate community/directory placements.

## Measurement discipline

- Compare releases and asset sets separately; annotate replaced/renamed assets.
- Requery source APIs and record timestamps for each observation.
- Never treat `RELEASES`, `SHA256SUMS`, API views, stars or forks as installs.
- Keep unknown values unknown; no manufactured website traffic or historical daily data.
- Avoid personal data, file upload tracking, fingerprinting and invasive telemetry.
- Report associations rather than claiming an individual post caused a change.
- Review results weekly: channels attempted, attributable evidence where available,
  objections and the next three prioritized actions.

Tracking ticket: https://github.com/Thavarshan/honeymelon/issues/113
