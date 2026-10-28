# Browser workspace contract

Related: [#64](https://github.com/Thavarshan/honeymelon/issues/64) and
[ADR 0001](0001-local-conversion-platform.md). Issue #64 is closed; this page
records the active package-boundary and CI contract.

## Runtime dependency rules

`npm run lint` builds internal declarations, runs typed ESLint, and executes the
syntax-aware workspace checker. New source workspaces are discovered
automatically. Unknown runtime packages require an explicit policy before they
pass. Test drivers and build configuration may use Node; application runtime
sources may not use test drivers as a dependency.

| Consumer         | Allowed internal runtime packages              |
| ---------------- | ---------------------------------------------- |
| contracts        | none                                           |
| core             | contracts                                      |
| converter        | core, contracts, ui                            |
| browser-engine   | core, contracts                                |
| ui               | none                                           |
| engine           | core, contracts                                |
| desktop renderer | core, contracts, converter, ui                 |
| web              | core, contracts, converter, browser-engine, ui |
| site             | contracts, ui                                  |

Node builtins, Electron, native executable packages and `@honeymelon/e2e` are
prohibited in browser runtime code. Core/contracts and either engine cannot
import a UI framework. Engine may use Node but cannot import Electron. Desktop
main/preload retain their existing platform responsibilities.

The checker parses static imports, side-effect imports, re-exports, import
types, literal dynamic imports, and CommonJS imports. Browser computed imports
are rejected because their destinations cannot be verified. Relative
cross-workspace paths and TypeScript-resolved aliases receive the same
dependency check as package imports. Runtime/peer/optional dependencies are
checked even when unused in source; development-only tools remain separate.

This is not a proof that arbitrary third-party code is browser-compatible. Each
new web/site production build must also succeed without Node polyfills, and its
bundle/network tests must verify actual platform behavior. Source tests are not
a substitute for testing the emitted application.

## Package template

Use existing pinned root tooling; do not add a second lockfile or an unpinned
compiler. A new browser library starts with this package shape (change name and
include only dependencies actually imported):

```json
{
  "name": "@honeymelon/core",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "test": "vitest run"
  },
  "dependencies": {
    "@honeymelon/contracts": "*"
  }
}
```

The workspace's `tsconfig.json` extends the browser configuration rather than
inheriting ambient Node types from the monorepo installation:

```json
{
  "extends": "../../tsconfig.browser.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "declaration": true
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["src/**/*.test.ts", "src/**/*.test.tsx"]
}
```

Keep tests in their own typecheck configuration if they need Node globals. Use
runtime exports from `dist`, keep type exports adjacent, and declare workspace
dependencies so Turborepo orders `^build` correctly. Do not reach into sibling
`src/` directories to avoid building declarations. Set application build outputs
when adding another application workspace. The existing Next.js static export
uses `out/`; include its build outputs in Turbo rather than assuming every app
emits `dist/`.

## CI tiers and reproduction

Pull requests run the shared quality/security gate, six native target builds,
integration tests, packaged smoke tests, and Linux distribution compatibility
jobs. They run the Chromium browser harness, the static site smoke test, the
workerd web host contract and the web converter suite in Chromium, Firefox,
WebKit and a mobile viewport as part of quality verification. PRs omit only the
exhaustive native conversion-pair matrix. Pushes to main, scheduled runs, manual
CI, and release tags retain the exhaustive matrix. Reusable verification
defaults to exhaustive so new callers cannot accidentally weaken release checks.
Signing policy is independent.

Quality checks run root unit tests, `npm run build:browser` (which includes
`apps/web` and its `verify-dist.mjs` gate), the browser fixture, the static site
and web host contracts, and `npm run test:web`. The web app is a client- only
Vite build; its worker entry is the `@honeymelon/browser-engine/worker` export,
bundled by the host.

From a clean checkout using Node.js 24.22.0 (`.nvmrc`) and npm 12.2.0:

```sh
npm ci
npm run lint
npm run format:check
npm run typecheck
npm test
npm run test:ci
npm run build:browser
npm run build
```

The tooling tests create an isolated browser workspace and confirm forbidden
imports, aliases and manifest dependencies cause a nonzero exit with file/line
or package diagnostics. They also check valid native imports and browser-safe
edges. Full native packaging remains verified by CI and the immutable release
tag.

## Shared configuration and task ownership

Apps and packages use the root Prettier, EditorConfig, and ESLint configuration.
Application source under `apps/*/src` and the Next.js `apps/site/app` tree uses
the same type-aware safety and public API documentation rules as package source.
Browser libraries extend `tsconfig.browser.json`, which inherits the strict
compiler contract from `tsconfig.base.json`. Framework-specific configuration
stays in the app that needs it; do not copy shared compiler options into apps.

Use `@honeymelon/ui` exports for reusable components and its stylesheet for
shared tokens. Site-specific composition, copy, and decorative styles may remain
in the site. Declare internal dependencies in each consumer's package manifest;
never import another workspace's private source via a relative path.

Run browser checks through the root Turbo entry points:

```sh
npm run test:site -- --project=site-chromium
npm run test:browser -- --project=chromium
```

`test:site` depends explicitly on `@honeymelon/site#build` because the test
driver serves exported HTML without importing the site as a runtime dependency.
`test:browser` builds its declared package dependencies before its harness. Both
browser tasks run uncached so a cached result cannot hide a browser or platform
change. Install the required Playwright browsers before running them. Build
artifacts are cached, but Next.js's internal `.next/cache` is excluded. Changes
to root formatting and compiler configuration invalidate Turbo tasks.
