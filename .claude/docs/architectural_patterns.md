# Architectural Patterns

Patterns and conventions that recur across the codebase. Each appears in
multiple files; keep new code consistent with them. Update the `file:line`
anchors as the code changes.

## 1. Two-world bridge (MAIN ↔ isolated)
`window.odoo` only exists in the page's MAIN world; extension APIs
(`browser.*`) only exist in the isolated world. The extension bridges them
instead of choosing one.

- `src/injected/odoo-reader.ts:25` (`resolveBranchInfo`) runs in the MAIN world
  (injected as a web-accessible `<script type="module">` via the crxjs
  `?script&module` import in `src/content/index.ts:12`), reads `window.odoo`,
  and answers requests.
- `src/content/index.ts` runs in the isolated world, injects the reader, and
  requests data over `window.postMessage`.
- `src/shared/messaging.ts` wraps both sides: every message carries a namespaced
  `type` (e.g. `"stagekeeper:branch-info:request"`) and a correlation `id`
  (`requestBranchInfo`, `src/shared/messaging.ts:41`), so responses match
  requests and never collide with the page's own messages. The message union
  lives in `src/shared/types.ts:50` (`BridgeMessage`).

Rule: nothing outside `odoo-reader.ts` touches `window.odoo`. We deliberately
avoid `world: "MAIN"` in the manifest because Firefox handles it differently
from Chrome; the injection bridge behaves identically on both.

## 2. Storage repository
All persistence goes through one module, `src/shared/storage.ts`, which exposes
intent-named functions: `upsertBranch` (`storage.ts:25`), `listBranches`
(`storage.ts:40`), `getBranch` (`storage.ts:45`), `removeBranch`
(`storage.ts:50`), `getSettings`/`setSettings` (`storage.ts:56`/`storage.ts:62`),
and `onStorageMutated` (`storage.ts:71`) for change subscriptions.
No content script, popup, options page, or the service worker calls
`browser.storage.*` directly.

Benefits realised across contexts: a single place to change the storage key
layout and one definition of the upsert-by-`branchId` semantics.

## 3. Anti-corruption layer for Odoo
The raw shapes we consume are messy and external: the `window.odoo` object tree
and the `branch_history` JSON-RPC response. Two modules quarantine that mess and
emit clean domain objects:

- `src/injected/odoo-reader.ts:25` (`resolveBranchInfo`) → resolves the current
  branch to an `OdooBranchInfo` (`src/shared/types.ts:18`):
  `{ branchId, projectName, repoName, branchName, stage }`. The `branchUrl` is
  derived from the location in `src/content/index.ts:31` (`evaluatePage`).
- `src/shared/odoo-api.ts:41` (`fetchBranchExpiration`) → performs the RPC and
  reduces `result.trackings` to a single `expirationDate` string via
  `parseExpirationDate` (`odoo-api.ts:32`; rule in `odoo-sh-integration.md`).

Everything downstream (storage, popup, options, background) consumes only the
`TrackedBranch` / `Settings` types in `src/shared/types.ts` and is insulated from
Odoo internals. If Odoo changes its payloads, only these two files change.

## 4. Typed message contracts
Every cross-context message — MAIN↔isolated over postMessage, and
content/popup/options↔service-worker over `browser.runtime` — is a member of a
discriminated union defined in `src/shared/types.ts`. Senders and receivers use
the typed helpers in `src/shared/messaging.ts`; `switch` on the `type`
discriminant keeps handling exhaustive.

## 5. SPA-aware content script
Odoo.sh is an OWL/WOWL single-page app: branch changes update the router/URL
without a full reload. The history patch lives in the MAIN-world reader
(`src/injected/odoo-reader.ts:64`) — the page's router calls
`pushState`/`replaceState` in that world, so patching the isolated world's copy
would never fire. The reader announces `stagekeeper:navigation` over the
bridge (plus `popstate`), and the content script re-runs detection
(`evaluatePage`, `src/content/index.ts:31`) and mounts/unmounts the Track
button on every route change. A monotonic token guards against a stale
evaluation clobbering a newer navigation, and a short retry loop covers the
WOWL store not being populated yet on fresh loads.

## 6. Settings-driven thresholds
The "warn N days before expiry" value lives in one place (`warningDays`, via
`getWarningDays`/`setWarningDays`, `src/shared/settings.ts:6`/`settings.ts:10`,
over storage; default in `src/shared/storage.ts:9`). Both consumers read it
rather than hard-coding a number:

- `src/background/service-worker.ts:50` (`runDailyCheck`) — decides which
  branches trigger a notification.
- `src/background/service-worker.ts:38` (`updateBadge`) — decides the toolbar
  badge count; re-run on every storage mutation via `onStorageMutated`.
- `src/popup/App.tsx` — decides which rows render red.

The options page (`src/options/App.tsx`) is the only writer. Date math is shared
through `src/shared/date.ts:7` (`daysUntil`) and `date.ts:15`
(`isExpiringWithin`) so background and popup agree on what "expiring" means.

## 7. Cross-browser via polyfill
Every extension API call goes through `import browser from
"webextension-polyfill"`; `chrome.*` is never used. Build variants
(`pnpm build` → `dist/` / `pnpm build:firefox` → `dist-firefox/`) differ only
in manifest background shape (service worker vs. scripts) and Firefox's
`browser_specific_settings`, both handled by the `env.mode === 'firefox'`
branch in `manifest.config.ts`, plus the `browser` option passed to `crx()` in
`vite.config.ts`.
