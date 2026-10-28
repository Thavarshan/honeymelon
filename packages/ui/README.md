# @honeymelon/ui

Shared React UI primitives, Honeymelon design tokens, typography, and styles
used by the desktop shell, converter features, and marketing site. This private
package contains presentation primitives; conversion workflows belong to
`@honeymelon/converter`, while application layouts belong to their hosts.

## Exports and integration

There is no root barrel export. Import components and helpers through the
package subpaths:

```tsx
import { Button } from '@honeymelon/ui/components/button';
import { cn } from '@honeymelon/ui/lib/utils';
```

Component/helper JavaScript and declarations come from `dist/`; style subpaths
export source CSS. `src/components/` includes buttons, cards, inputs, selects,
dialogs, popovers, tabs, tooltips, progress and other reusable primitives.
`src/styles/` contains base styles, globals and tokens; `src/preset.json` and
`components.json` record the shadcn setup. React and React DOM are peers.

Hosts process `@honeymelon/ui/styles/globals.css` with Tailwind and own document
appearance, layout, and theme selection. For converter hosts, import UI and
converter CSS through a single host CSS entry so source scanning is processed.
Do not introduce filesystem, Electron, native engine, or application lifecycle
logic into this browser-safe package.

## Commands

Run commands from the repository root with Node.js 24.22.0 and npm 12.2.0.
Install once with `npm ci`; run `npm run build:packages` before invoking
workspace checks directly so dependency exports exist. Root `npm run typecheck`
and `npm test` use Turbo to build upstream packages automatically.

```sh
npm run build -w @honeymelon/ui
npm run typecheck -w @honeymelon/ui
npm test -w @honeymelon/ui
npm run ui:dev
npm run ui:build
```

`ui:dev` serves the Vite component gallery; `ui:build` writes it to
`packages/ui/.gallery/`. `npm run dev -w @honeymelon/ui` watches TypeScript
exports rather than starting the gallery. Primitive tests exercise shared
behavior; host/browser tests remain necessary for page layout, accessibility,
and motion.

See the [converter host contract](../converter/README.md) and
[site integration](../../apps/site/README.md).
