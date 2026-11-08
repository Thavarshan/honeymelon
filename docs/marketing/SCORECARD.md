# Honeymelon growth scorecard

First verified observation: **2026-11-09** (Asia/Colombo).
GitHub API collection: `2026-11-08T19:52:39.404Z` (UTC).

## Baseline

- GitHub stars: **157**.
- GitHub forks: **11**.
- Latest stable desktop release: **v2.2.3**.
- Stable binary asset download events: **2,184** (9 binary assets).
- Stable `RELEASES` metadata download events: **17** (excluded).
- Published unsigned desktop beta: **v3.0.0-beta.1**.
- Beta binary asset download events: **177** (12 binary assets).
- Beta `SHA256SUMS` download events: **3** (excluded).
- Website visits and referral traffic: **unknown**.
- First-time external accepted contributors: **unknown**.
- Actionable user feedback: **unknown**.

Sources:

- [GitHub repository API](https://api.github.com/repos/Thavarshan/honeymelon)
- [Stable release API](https://api.github.com/repos/Thavarshan/honeymelon/releases/tags/v2.2.3)
- [Beta release API](https://api.github.com/repos/Thavarshan/honeymelon/releases/tags/v3.0.0-beta.1)
- [Dated per-asset observation](snapshots/2026-11-09.md)
- [Weekly CSV ledger](snapshots/weekly.csv)

**Important:** These are *cumulative per-asset events*, not campaign growth,
installs, unique users or active users. One downloader can fetch several assets.
Metadata downloads are excluded from binary counts. The stable release predates
the campaign. No historical daily downloads were invented.

## Weekly snapshot checklist

Create a new dated observation and append a CSV row each week.

- Week ending (Asia/Colombo): `YYYY-MM-DD`.
- Exact collection time and API sources: unknown until measured.
- Stars and delta from previous comparable snapshot: unknown.
- Forks and delta: unknown.
- Stable binary download events and delta: unknown.
- Beta binary download events and delta: unknown.
- Accepted external first-time contributor PRs: unknown.
- Actionable user feedback: unknown.
- Aggregate website visits/referrers (if available): unknown.
- Tutorials and authentic community interactions: unknown.
- Channels tried and measured results: unknown.
- Objections, uncertainty and lessons learned: unknown.
- Next three prioritized actions: unknown.

## Privacy-conscious UTM names

Use public campaign identifiers, never user-specific tags.

Example:

`?utm_source=devto&utm_medium=community&utm_campaign=honeymelon_beta_2026&utm_content=architecture_story`

- `utm_source`: channel, such as `devto` or `show_hn`.
- `utm_medium`: `community`, `article` or `directory`.
- `utm_campaign`: fixed campaign slug.
- `utm_content`: post or creative identifier, not a person.

Do not install analytics, fingerprinting or upload telemetry. Without
independently verified aggregate analytics, attribution stays unknown.

## Working targets

- Add 100 stars above the verified baseline.
- Accept PRs from 5 new external contributors.
- Collect 25 actionable feedback reports.
- Gain 500 **additional** binary asset download events after this snapshot.
- Publish 12 useful tutorials and 10 community/directory placements.

These are planning goals, not forecasts or claims of current adoption.

## Measurement rules

- Separate stable and beta releases.
- Requery sources with a timestamp at each snapshot.
- Note asset replacements and changes in release contents.
- Never call asset downloads installs or unique users.
- Keep missing data marked **unknown**.
- Do not collect personal data or files.
- Report associations, not unsupported claims of causation.

Tracking issue: [#113](https://github.com/Thavarshan/honeymelon/issues/113).
