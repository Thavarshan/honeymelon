# Building a local converter across desktop and web boundaries

**Developer-story draft. Not published.**

Honeymelon started as a desktop media converter under the name Comet. The
project has since moved toward a shared TypeScript/React architecture with
separate native and browser execution engines.

That sounds like a UI refactor, but the difficult part is deciding which work
can actually be shared.

## Share the workflow, not the filesystem

A desktop conversion can use Electron, local paths and a bundled FFmpeg
executable. A browser conversion receives `File` objects and works with browser
APIs, workers and carefully bounded memory.

Those engines are different. Importing `node:fs` or `child_process` into a
browser bundle would not create a working web converter.

The repository therefore separates contracts, queue/domain logic, shared
converter UI and platform-specific execution adapters.

A shared interface still needs capability negotiation. A format exposed by
desktop FFmpeg may not be available in a particular browser or device.

## Safeguards worth testing

- Do not overwrite original input files.
- Cancel a long-running conversion without leaving unexpected output.
- Keep platform-specific code outside browser bundles.
- Explain unsupported formats before starting.
- Test packaged desktop behavior, not just isolated helpers.
- Test browser output and blocked network requests with synthetic media.
- Distinguish draft functionality from a published release.

These problems become more visible when a queue contains multiple files or a
user changes output settings while work is in progress.

## Deployment is part of the product boundary

The marketing site is a static Next.js export. The browser app is designed for
client-side conversion behind Cloudflare Workers Static Assets, not for
uploading source media to a conversion server.

A static deployment architecture also introduces practical checks: asset size
budgets, content security policy, offline behavior and client-side WASM/runtime
limits.

The public browser converter must not be called released until the actual
deployment, supported browsers and privacy/security checks pass.

## What is currently available?

The latest stable desktop release is **v2.2.3**. A separate **v3.0.0-beta.1**
desktop release is unsigned and has the React-based UI. Honeymelon Web remains
gated by the repository's launch checklist.

If you are learning React or TypeScript, browse the small, verified contributor
issues instead of assuming every architecture ticket is appropriate for a first
pull request.

**Explore:** [Honeymelon source](https://github.com/Thavarshan/honeymelon).

**Review gate:** verify the architecture and release names against current main,
source adapters and public deployment state.
