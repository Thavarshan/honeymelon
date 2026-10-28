# Honeymelon marketing site

A **zero-server, statically generated Next.js site** for the desktop converter.
The current implementation includes marketing pages, a versioned release and
download centre, and an assets-only Cloudflare deployment/recovery workflow. The
presence of deployment code does not establish that live environments have been
configured or verified; use the operational runbook for that evidence.

## If you are new to web development

Imagine a printed brochure. Next.js creates the brochure's pages **once while
building** the project; Cloudflare simply hands those finished pages to
visitors. Unlike a traditional web application, it does not need a continuously
running computer to assemble each page.

- **React** describes what visitors see, using components (small reusable pieces
  of the page).
- **TypeScript** checks that components receive the right kinds of values.
- **CSS** controls typography, layouts, colors, and animations.
- **`@honeymelon/ui`** supplies our shared Button, Badge, Inter font, and
  tokens. The marketing-specific layout is deliberately custom, not another
  dashboard.
- **GitHub Releases** hosts downloadable desktop applications. The site links
  visitors there; it does not create or distribute installers itself.

## Where things live

| Path                               | Plain-English purpose                               |
| ---------------------------------- | --------------------------------------------------- |
| `app/layout.tsx`                   | Header, navigation, footer and search metadata      |
| `app/page.tsx`                     | Home-page story and supported media categories      |
| `app/download/page.tsx`            | Automatic download plus every package as a link     |
| `app/not-found.tsx`                | The friendly page when a URL does not exist         |
| `src/components/site-header.tsx`   | Sticky navigation and accessible mobile sheet       |
| `src/components/motion-toggle.tsx` | Pause/resume animation button                       |
| `app/globals.css`                  | All site art direction, responsive rules and motion |
| `public/_headers`                  | Cloudflare HTTP security policy                     |
| `wrangler.toml`                    | Static-assets-only hosting setup                    |
| `scripts/verify-export.mjs`        | Tests built HTML, links and security files          |

Every component has a docblock explaining **why it exists**, and the less
obvious code paths include inline explanations. Comments should teach intent and
constraints, not restate every obvious line.

## Run the site

Use the repository-pinned Node.js 24.22.0 and npm 12.2.0.

```sh
npm ci
npm run build:packages
npm run dev -w @honeymelon/site
```

Open the local address printed by Next.js. While developing, React updates when
you save a file.

```sh
npm run typecheck -w @honeymelon/site
npm test -w @honeymelon/site
npm run build -w @honeymelon/site
```

The last command creates **`apps/site/out/`**, containing ordinary HTML and
static assets. The export verifier checks the public routes, the 404 page,
sitemap/robots, social imagery, official release links, asset budgets, and the
Cloudflare security file. Repository-wide CI also runs lint, formatting, browser
package builds, a Chromium smoke test at mobile and desktop widths, and the
unchanged native matrix.

## Motion and accessibility

The site follows the idiom of Apple's product pages: large confident type,
generous space, the product screenshot as the hero, one idea per section,
alternating light and black bands, and rounded bento tiles. It uses only the
shared shadcn Neutral tokens; dark bands scope `.dark` to a section so the same
tokens invert. Secondary text uses a slightly darker grey than
`muted-foreground` so it passes WCAG AA on grey bands.

- Shared shadcn buttons, badges, cards and dialogs come from `@honeymelon/ui`;
  `app/globals.css` only sizes them for a product page.
- Element resets sit in `@layer base`, so component colours (for example a
  Button rendered as a link) are never overridden.
- Scroll reveals animate `transform` only, never opacity, so text keeps full
  contrast and nothing shifts layout. Browsers without scroll-driven animations
  simply show the content.
- The mobile menu traps focus, supports Escape and restores trigger focus.
- Native FAQ disclosures work with keyboard input and without JavaScript.
- Essential navigation is also available in the static footer.
- The opening copy has one short entrance animation, with no decorative loops.
- `prefers-reduced-motion` disables animation automatically.
- The footer retains the keyboard-accessible **Pause motion** control.
- Controls use the shared default light/dark foreground and surface tokens.

No reference analytics, external fonts or visitor-time GitHub API calls are
carried over. All media screenshots depict Honeymelon's unsigned 3.0 beta and
are labeled accordingly; the stable download remains separate.

## Strict typing and boundaries

The workspace inherits `strict: true`, `noUncheckedIndexedAccess`,
`noImplicitReturns`, and `exactOptionalPropertyTypes` from the monorepo. Shared
content arrays use inferred readonly tuples and validated contract types; React
components declare their return and prop types. `app/` and `src/` remain
browser-safe, without Electron, native FFmpeg, runtime Node imports, or uploaded
media.

## Security, hosting and honest product claims

`next.config.ts` uses `output: 'export'`; the Wrangler config serves only static
`out/` assets, with explicit 404 behavior. **There is no Worker script, SSR,
database, media API, account, user tracking, or paid backend.** Local build and
verification require no Cloudflare credentials. Deployment uses the dedicated
workflow and environment-scoped credentials.

`public/_headers` includes CSP, anti-framing, HSTS and privacy-friendly feature
restrictions. Next.js' static bootstrap currently needs inline script
permission. Tightening that exception should be tested with a deployed preview
rather than silently breaking the site. Local file serving does not apply
Cloudflare response headers.

Desktop v3.0.0-beta.1 remains **unsigned** and is clearly marked; install
warnings and checksum verification are explained. No working web converter is
advertised.

## Release and download data

`src/data/releases.json` is the committed GitHub release manifest. The build
prepares a release snapshot, exports Next.js HTML, then verifies that export.
`src/lib/releases.ts` validates and normalizes releases, compares versions, and
classifies assets. `src/lib/downloads.ts` turns browser signals into a platform
guess and picks the matching package. `SmartDownload` starts it automatically
(once per tab, with Cancel) or offers one-click choices when the browser cannot
know, and `DownloadLibrary` lists every package of every version as a plain
link. Downloads go to GitHub release assets rather than a media/storage service
owned by the site.

```sh
npm run releases:refresh -w @honeymelon/site
npm run build -w @honeymelon/site
npm run test:site
```

Refresh reads GitHub release metadata; review the resulting manifest changes.
The release-manifest workflow automates refreshes. Static builds consume a
snapshot rather than requiring each visitor to call GitHub. Stale or missing
release data must retain honest warnings/fallbacks; never invent a download URL.
See the [release centre contract](../../docs/releases/release-center.md).

## Deployment status and configuration

`HONEYMELON_SITE_URL` must contain the actual production origin for canonical
URLs and indexable sitemap metadata. Unconfigured builds remain unindexed
previews. The `site-deploy.yml` workflow admits verified `main` commits and
provides explicit preview/production deployment and rollback actions. Wrangler
serves `out/` assets without an application Worker script or storage bindings.

Live deployment requires separately configured Cloudflare account access, GitHub
environments, URL variables and environment-scoped credentials. Follow
[deployment and recovery](../../docs/operations/site-deployment.md) for setup,
verification, and rollback. This README documents repository support, not a
claim that deployment or human visual acceptance has occurred.

See also the [publication contract](../../docs/architecture/site-publication.md)
and [P2.2 acceptance record](../../docs/releases/site-p2.2-acceptance.md).

## Review checklist

1. Visit every public route and the 404 page at 320px, 390px, tablet and
   desktop.
2. Use keyboard only: skip link, nav, pause button, download links and focus.
3. Test with reduced motion, with motion paused, and with JavaScript disabled.
4. Confirm no page sends source media, calls an API, or promises web tools.
5. Confirm every linked release exists and beta trust warnings are visible.
6. Run the workspace tests and complete root CI before merging.

A real Chromium smoke test checks navigation, 320px/390px/tablet/desktop
overflow, an operable pause button, reduced motion and read-only page requests.
It runs from static `out/` over localhost with no Cloudflare credentials.

Visual and physical-device review still need human sign-off. Passing build and
source tests are **not** a substitute for checking the actual page in browsers.
