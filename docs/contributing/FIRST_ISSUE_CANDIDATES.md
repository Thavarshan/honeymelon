# Small contributor opportunity audit

**Audit date:** 2026-11-09. **Status:** Candidate inventory for issue #115;
these are **not** published or labeled `good first issue` yet.

The list is deliberately restricted to small documentation or tooling
improvements, with exact target files and evidence already visible on main.
Before publishing any individual candidate, recheck current main and open
PRs so the work has not been completed by someone else.

## Candidate 1: reconcile the docs index rebrand status

**File:** `docs/README.md`.

**Verified need:** The dated status says issues #86, #87, #92, #93, #95
and #96 are open. GitHub shows all six closed as of this audit.

**Change:** Make the current state explicit without overwriting historical
2026-10-28 observations. Link to #84 and #85 for remaining launch gates.

**Accept:** The historical date remains clear; current issue status is correct;
all links resolve. **Check:** `npm run format:check`. Complexity: docs-small.

## Candidate 2: update stale Release Center deployment status

**File:** `docs/releases/release-center.md`.

**Verified need:** Text calls issue #72 an open milestone although it is
closed. Release Center source verification and actual live deployment are
different claims.

**Change:** Record #72's closure as historical source/deploy work and point
to current site and web operation evidence for live checks.

**Accept:** No unsupported live claim, stable/beta labels stay accurate.
**Check:** `npm run format:check`. Complexity: docs-small.

## Candidate 3: distinguish the implemented browser app from its launch

**File:** `docs/architecture/site-publication.md`.

**Verified need:** It states there is no web-converter application, although
`apps/web` and `@honeymelon/browser-engine` exist.

**Change:** Explain that a browser app exists in source but is not confirmed
as publicly launched. Link to #84 and #85.

**Accept:** No public product CTA is invented.
**Check:** `npm run format:check`. Complexity: docs-small.

## Candidate 4: improve PR testing evidence fields

**File:** `.github/PULL_REQUEST_TEMPLATE.md`.

**Verified need:** The current generic template asks for 'Learning' and
unexplained TODOs but does not ask for actual commands or skipped tests.

**Change:** Add problem link, summary, relevant test commands/results,
screenshots/versions if UI and release/secret safety reminders.

**Accept:** Simple docs PRs can fill it quickly; no mandatory cross-platform
claims. **Check:** `npm run format:check`. Complexity: docs-small.

## Candidate 5: clarify historical domain checks

**File:** `docs/branding/name-decision-record.md`.

**Verified need:** Its October evidence mentions a November 3 domain expiry;
that deadline is in the past. The record is historical, not a current WHOIS
or trademark verification.

**Change:** Add a top note separating original dated investigation from
current DNS, domain, legal, cost and handle checks needing owner verification.

**Accept:** Original evidence is preserved; no claim about today’s paid
domain ownership. **Check:** `npm run format:check`. Complexity: docs-small.

## Candidate 6: explain web deployment gating in the site guide

**File:** `apps/site/README.md`.

**Verified need:** The site README explains how to run a static Next.js site
but does not give a newcomer a direct cross-reference to the active #84/#85
web app deployment and production gating process.

**Change:** Add a short section distinguishing the marketing site Worker,
the browser app Worker, and desktop downloads, with documented runbook links.

**Accept:** No new infrastructure or paid setup is required.
**Check:** `npm run format:check`. Complexity: docs-small.

## Candidate 7: add truthful version-specific screenshot guidance

**File:** `apps/site/README.md` or `docs/releases/site-p2.2-acceptance.md`.

**Verified need:** Marketing site screenshots use the React-based beta;
stable v2.2.3 has an older interface. The media-kit #114 notes this risk.

**Change:** Add a non-duplicative caption/version QA checklist in the
site's documentation or acceptance record.

**Accept:** Stable/beta are not conflated; reuse existing screenshots.
**Check:** `npm run format:check`. Complexity: docs-small.

## Candidate 8: audit web PWA manual limitations

**File:** `apps/web/README.md`.

**Verified need:** The app guide lists commands and static host architecture
but does not explain how a newcomer should report failures found on real
mobile browsers. #85 explicitly requires iOS/Android manual checks.

**Change:** Add a short link to the #85 test matrix, requested OS/browser,
and safe synthetic reproduction guidance. Do not mark devices passed.

**Accept:** Supports a real follow-up report with no false acceptance.
**Check:** `npm run format:check`. Complexity: docs-small.

## Triage rules before publishing these as issues

- Recheck current main and PRs for overlap before assigning each candidate.
- Make each issue small, independent, reproducible and acceptance-testable.
- Label `good first issue` only after a maintainer verifies the task.
- Prefer fewer verified tasks over artificially filling a quota.
- If the candidate was fixed, mark it retired instead of publishing a duplicate.
- Do not imply guaranteed two-day review or mentoring availability.

This inventory supports onboarding, but does **not** itself constitute
eight ready, verified GitHub issues with labels and assignees.
