# Stagekeeper

## Project Overview

Cross-browser (Chrome + Firefox) Manifest V3 extension that tracks the
expiration dates of Odoo.sh **staging** branches and warns before they are
auto-dropped. Odoo.sh cut staging retention from 3 months to 1 month, so
un-backed-up staging databases now disappear with little warning. The extension
adds a "Track" button on staging branch pages, stores each tracked branch's
expiration date locally, and raises a browser notification a configurable number
of days before expiry.

Original build brief and acceptance criteria: `PROMPT.md`.

## Tech Stack

- React — popup + options UI
- Vite — build tooling
- @crxjs/vite-plugin — MV3 build + HMR; `manifest.config.ts` is the entry point
- webextension-polyfill — cross-browser `browser.*` API (never `chrome.*`)
- TypeScript — typed message + storage contracts
- browser.alarms / browser.notifications — daily expiry check (no `setInterval`)

## How It Works (three flows)

1. **Every page** — content script detects odoo.sh, reads the branch stage via a
   MAIN-world bridge, and if `staging`, injects a Track button. Survives SPA
   navigation. Entry: `src/content/index.ts:31` (`evaluatePage`).
2. **On Track click** — fetch the live expiration via RPC, then upsert the record
   into storage keyed by `branchId`. Path: `src/content/track-button.ts:76`
   (`handleTrackClick`) → `src/shared/odoo-api.ts:41` (`fetchBranchExpiration`)
   → `src/shared/storage.ts:25` (`upsertBranch`).
3. **Once per day** — an alarm reads stored branches, compares each against the
   configurable warning threshold, fires notifications, and the popup highlights
   expiring rows red. Entry: `src/background/service-worker.ts:50`
   (`runDailyCheck`). A toolbar badge shows the expiring count
   (`updateBadge`, `service-worker.ts:38`), refreshed on the alarm and on every
   storage mutation.

## Key Directories

- `src/content/` — isolated-world content script: page detection, SPA-aware
  Track button, storage writes (`index.ts`, `track-button.ts`).
- `src/injected/` — MAIN-world script that reads `window.odoo` (`odoo-reader.ts`).
- `src/background/` — MV3 service worker: alarms + notifications.
- `src/popup/` — React popup: list of tracked branches with expiry highlighting.
- `src/options/` — React settings page: configurable `warningDays`.
- `src/shared/` — cross-context modules: `storage.ts`, `odoo-api.ts`,
  `messaging.ts`, `settings.ts`, `date.ts`, `types.ts`.
- `.claude/docs/` — deep-dive documentation (see Additional Documentation).

## Build & Test Commands

- `pnpm install` — install dependencies
- `pnpm dev` — Vite dev server + HMR (load unpacked from `dist/`)
- `pnpm build` — production build for Chrome → `dist/`
- `pnpm build:firefox` — Firefox build → `dist-firefox/`
- `pnpm lint` — ESLint
- `pnpm typecheck` — `tsc --noEmit`

Load unpacked: Chrome → `chrome://extensions` → `dist/`; Firefox →
`about:debugging` → `dist-firefox/manifest.json`.

## Cross-cutting Rules

- Always `import browser from "webextension-polyfill"`; never call `chrome.*`.
- All storage access goes through `src/shared/storage.ts` — no context calls
  `browser.storage` directly.
- All knowledge of the `window.odoo` shape and the RPC contract stays in
  `src/injected/odoo-reader.ts` and `src/shared/odoo-api.ts`; downstream code
  only sees clean `TrackedBranch` domain objects (`src/shared/types.ts`).
- MAIN-world data is read only via the postMessage bridge (`src/injected/…` ↔
  `src/content/index.ts`), never `world: "MAIN"` (Firefox compatibility).

## Additional Documentation

Check these when working on the relevant area (paths point at the source of
truth; refresh the `file:line` anchors as the code evolves):

- `.claude/docs/architectural_patterns.md` — the recurring patterns: two-world
  bridge, storage repository, anti-corruption layer, typed messaging, SPA-aware
  content script, settings-driven thresholds.
- `.claude/docs/odoo-sh-integration.md` — the `window.odoo` shape, the
  `branch_history` RPC request/response contract, and the expiration-parsing rule.
- `.claude/docs/storage-schema.md` — the `TrackedBranch` record shape and the
  upsert-by-`branchId` behaviour.
