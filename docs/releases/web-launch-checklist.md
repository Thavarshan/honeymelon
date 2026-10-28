# Honeymelon Web beta launch checklist

Related: [#85](https://github.com/Thavarshan/honeymelon/issues/85),
[#82](https://github.com/Thavarshan/honeymelon/issues/82),
[#83](https://github.com/Thavarshan/honeymelon/issues/83),
[#84](https://github.com/Thavarshan/honeymelon/issues/84). Copy this list into
the launch issue and record evidence (links, versions, dates) for every line. A
line without evidence is a no-go.

## Done in source (28 October 2026)

- [x] Web app, browser engine, PWA and deploy workflow implemented and tested
      locally.
- [ ] The same, merged with passing CI.
- [x] `npm run test:web` passes in Chromium and Firefox locally.
- [ ] `npm run test:web` passes in all engines, including WebKit, on CI.
- [x] Static host contract passes on workerd for preview and production.
- [x] Site links to the app and shows browser privacy text only when
      `HONEYMELON_WEB_PRODUCTION_URL` is set; until then it says the app is not
      available.
- [x] Public [limits, privacy and support page](../web/README.md),
      [capability matrix](../web/capability-matrix.md),
      [threat model](../security/web-threat-model.md),
      [ADR 0003](../architecture/0003-browser-media-engine.md).

## Before preview

- [ ] Owner completes
      [one-time setup](../operations/web-deployment.md#one-time-setup-owner).
- [ ] `Deploy web app` → preview → deploy succeeds, including live verification
      and the live Chromium smoke test. Record the run URL and version UUID.

## Manual checks on the preview URL

Record browser and OS versions for each.

- [ ] Edge (Windows): convert PNG→JPEG, MP3→WAV, WebM→frame; install as app.
- [ ] Safari (macOS): same conversions; WebP shows as unavailable; Add to Dock.
- [ ] Firefox: load once, go offline (DevTools or airplane mode), reload,
      convert an image.
- [ ] iOS Safari (real device): pick from Photos and Files, download/share the
      output, background the tab during a conversion, Add to Home Screen.
- [ ] Android Chrome (real device): same, plus install prompt.
- [ ] Screen reader pass: VoiceOver or NVDA through add files → convert →
      download; status changes are announced.
- [ ] 200% zoom and Windows high contrast: no clipped controls.
- [ ] Update flow: deploy a second preview, confirm the in-app prompt, reload.
- [ ] Rollback rehearsal: roll preview back to the previous version UUID,
      confirm `/deployment.json`, then redeploy.

## Production

- [ ] Same commit as the verified preview; `Deploy web app` → production.
- [ ] Set `HONEYMELON_WEB_PRODUCTION_URL`, then deploy the site; confirm the
      header link and privacy section on the live site.
- [ ] Desktop regression: the latest `CI` run on `main` is green (native builds,
      packaged smoke tests, Linux compatibility). Desktop downloads on the site
      still point at published (non-draft) releases.
- [ ] Changelog entry and GitHub release notes mention Honeymelon Web (beta)
      with its limits link.
- [ ] Monthly [$0 audit](../operations/web-deployment.md#monthly-0-audit)
      scheduled.

## Feedback

Bug reports go through GitHub issues (no forced account beyond GitHub, no
analytics). Ask for browser, version and the _Technical details_ text, never
private media.

## No-go

Any of: a request leaving the origin during conversion; a format offered that
fails for every file; a CSP or header check failing live; an accessibility
blocker in add/convert/download; a dynamic Worker invocation or binding on the
web projects; desktop CI red on `main`.
