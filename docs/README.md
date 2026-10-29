# Honeymelon technical documentation

Architecture contracts, operating procedures, and historical acceptance records
for the current monorepo. Issue status below was checked on 2026-10-28; consult
GitHub for live status before acting on a deployment or release.

## Current architecture and operations

- [ADR 0002: Honeymelon identity](architecture/0002-honeymelon-identity.md) —
  approved identifiers, preference import, coexistence and rollback.
- [Brand provenance](branding/provenance.md) — original assets and regeneration.
- [Brand decision record](branding/name-decision-record.md) — Comet vs
  Honeymelon, dated domain/handle/package checks and open legal items (#87).

- [ADR 0001: local conversion platform](architecture/0001-local-conversion-platform.md)
  — original decision and implementation roadmap, with a current-state note.
- [Browser workspace contract and CI tiers](architecture/browser-workspaces.md)
  — dependency boundaries, Turbo, and CI coverage.
- [Platform conversion services](architecture/conversion-services.md) — shared
  service lifecycle, native adapter, and browser adapter.
- [ADR 0003: browser media engine](architecture/0003-browser-media-engine.md) —
  native browser decoders instead of FFmpeg WASM, with evidence (#78–80).
- [Honeymelon Web limits, privacy and support](web/README.md) — the public page
  the app links to; [capability matrix](web/capability-matrix.md) (#81).
- [Web threat model and release audit](security/web-threat-model.md) (#83).
- [Web deployment and $0 guardrails](operations/web-deployment.md) (#84).
- [Adapter contracts and browser tests](architecture/adapter-contract-testing.md)
  — current unit, browser, site, and native test scope.
- [Site publication contract](architecture/site-publication.md) — static export,
  SEO and publication gates.
- [Release centre operations](releases/release-center.md) — release snapshot
  refresh, trust and download selection.
- [Static site deployment](operations/site-deployment.md) — preview/production
  setup, verification and rollback.
- [Rebrand rollback runbook](operations/rollback-runbook.md) — phased site/DNS,
  release artifact and app identity rollback (#95).

## Acceptance and compatibility evidence

- [Web launch checklist](releases/web-launch-checklist.md) — remaining manual
  device, screen-reader and deployment evidence (#85).
- [Rebrand release checklist](releases/rebrand-release-checklist.md) —
  per-target pass/fail evidence and no-go criteria (#95).
- [Desktop identity test matrix](releases/desktop-identity-test-matrix.md) —
  install, upgrade, coexistence, uninstall and rollback scenarios (#92).
- [Honeymelon transition guide](releases/honeymelon-transition-guide.md) — draft
  "Comet is becoming Honeymelon" announcement and FAQ (#96).
- [Desktop beta acceptance](releases/v3.0.0-beta.1-acceptance.md) — CI and
  release evidence plus remaining human sign-off.
- [Site P2.2 acceptance](releases/site-p2.2-acceptance.md) — historical
  source-delivery verification; it does not prove live deployment.
- `compatibility/*.json` — lab probe results retained with their tested
  runtime/tool versions. Re-run probes after dependency, browser, or bundler
  changes; these are not universal compatibility guarantees.

As of 2026-10-28, `apps/web` (Honeymelon Web beta) and a working
`@honeymelon/browser-engine` are implemented and tested: images, audio to WAV,
and video frame/audio extraction, all local, plus PWA and deploy tooling. The
app is not deployed yet; real-device, Safari, Edge and screen-reader checks are
listed in the web launch checklist.

As of 2026-10-28, rebrand issues #86, #87, #92, #93, #95 and #96 remain open.
The source rename is merged; device acceptance, signing, custom-domain and
trademark items are listed as open in the documents above. No Honeymelon desktop
release has been published.
