# Build Prompt — Stagekeeper (browser extension)

Build a cross-browser (Chrome + Firefox) Manifest V3 browser extension that
tracks the expiration dates of my Odoo.sh **staging** branches and warns me
before they are automatically dropped. Follow this brief exactly. Where I give
concrete data contracts (the `window.odoo` shape and the RPC payloads), treat
them as authoritative — they were captured from the live app.

---

## 1. Purpose & background

Odoo.sh staging branches have an expiration date. It used to be 3 months, so
losing a staging DB was rarely a concern. It is now **1 month**: a branch
rebuilt today is auto-dropped ~30 days later. I manage several Odoo.sh projects
and need a passive tracker that reminds me before any staging database expires,
so I can back it up or rebuild in time.

## 2. Goal

A browser extension that:

1. Detects when I'm on an Odoo.sh **staging** branch page and shows a **Track** button.
2. On click, reads the branch's real expiration date and stores it locally
   (upserting if the branch is already tracked).
3. Once per day, checks all tracked branches and raises a browser notification +
   red highlight for any expiring within a configurable number of days.
4. Provides a popup listing all tracked branches and a settings page to
   configure the warning threshold.

## 3. Tech stack (required)

| Tool                                           | Role                                                  |
| ---------------------------------------------- | ----------------------------------------------------- |
| React                                          | Popup + options page UI                               |
| Vite                                           | Build tooling                                         |
| @crxjs/vite-plugin (latest, Vite 8 / Rolldown) | MV3 build + HMR; `manifest.config.ts` is the entry    |
| webextension-polyfill                          | Cross-browser `browser.*` API                         |
| TypeScript                                     | Typed message + storage contracts (use it throughout) |

Target Chrome + Firefox from one codebase. Use `pnpm`.

## 4. Hard constraints (these are the parts that will bite you)

- **MAIN-world access.** `window.odoo` lives in the page's MAIN world. A content
  script runs in an isolated world and cannot see it. Because we target Firefox
  too, do **not** rely on `"world": "MAIN"` in the manifest. Instead: the
  isolated content script injects a `<script src=…>` (a web-accessible resource)
  that runs in the MAIN world, reads `window.odoo`, and posts results back via
  `window.postMessage`. Correlate request/response with an id and a namespaced
  message `type` so we don't collide with the page's own messages.
- **SPA navigation.** Odoo.sh is an OWL/WOWL single-page app. Switching branches
  updates the URL/router **without a full reload**. The content script must
  re-evaluate the page (and add/remove the Track button) on route changes —
  patch `history.pushState`/`replaceState` and listen to `popstate`, or use a
  small router-path poller. Do not run only on initial load.
- **No `setInterval` in the background.** MV3 service workers are ephemeral. Use
  `browser.alarms` (period 1440 min) plus a check on `runtime.onStartup` for the
  daily job. Fire alerts via `browser.notifications`.
- **Never call `chrome.*` directly.** Always `import browser from
"webextension-polyfill"`.
- **Auth.** The RPC is session-cookie authenticated. Make the RPC `fetch` from
  the content script while on `odoo.sh` (same-origin) so cookies ride along —
  no `access_token` and no background host fetch needed.

## 5. Data contracts (captured from the live app — treat as source of truth)

### 5a. Reading branch identity from `window.odoo` (MAIN world)

The current URL is like `/project/<project>/branches/<branchName>/<page>`, e.g.
`/project/mega-print/branches/staging/history`.

Branch + project data lives at:
`window.odoo.__WOWL_DEBUG__.root.store`

- `store.repo.project_name` → e.g. `"mega-print"`
- `store.repo.name` → e.g. `"mega_print_odoo"`
- `store.repo.branches[]` → each `{ id, name, stage, ... }`, e.g.
  `{ id: 3660248, name: "staging", stage: "staging" }`

To resolve the current branch: parse `<branchName>` from the URL, find the
matching entry in `store.repo.branches` by `name`, and read its `id` and
`stage`. Only proceed with the Track button when `stage === "staging"`.
(Defensively handle `__WOWL_DEBUG__` or the branch being absent — fail quietly,
no button.)

### 5b. Fetching the expiration date (RPC, from the content script)

```
POST https://www.odoo.sh/project/json/branch_history
Content-Type: application/json
credentials: "same-origin"

{ "id": 3, "jsonrpc": "2.0", "method": "call",
  "params": { "branch_id": <branchId>, "offset": 0 } }
```

Response shape (`result.trackings` is an array, newest first). Each tracking has
a top-level `expiration_date` and a `build.expiration_date`. Dropped/old builds
have `expiration_date: false`; the **live** build has a real date string
(`"YYYY-MM-DD"`).

**Parsing rule:** iterate `result.trackings` and take the **first** tracking
whose `expiration_date` (falling back to `build.expiration_date`) is a truthy
string. Do **not** hard-code index 0 — a fresh push mid-build can shift it.
Store that date. If none is truthy, surface a "no live build / couldn't
determine expiry" state rather than storing a bogus date.

## 6. Storage schema

Local storage (`browser.storage.local`), one collection of tracked branches
keyed by `branch_id`. Each record:

```ts
type TrackedBranch = {
	branchId: number; // unique key
	projectName: string; // "mega-print"
	repoName: string; // "mega_print_odoo"
	branchName: string; // "staging"
	expirationDate: string; // "YYYY-MM-DD"
	branchUrl: string; // odoo.sh URL to the branch
	trackedAt: string; // ISO timestamp
	updatedAt: string; // ISO timestamp
};
```

Settings (separate key): `{ warningDays: number }`, default 1.

**Upsert-on-Track:** when Track is clicked, look up by `branchId`; if present,
overwrite `expirationDate`/`updatedAt` (this is how we handle rebuilds resetting
the real date — I explicitly want the update to happen on Track click, not via a
background refresh). If absent, insert.

## 7. Process flows (implement exactly these)

**Flow A — every page (content script):**
`is odoo.sh?` → read branch stage via the MAIN-world bridge → `staging?` → if
yes, inject a "Track" button into the branch page UI. Re-run on SPA route change.

**Flow B — on Track click:**
resolve `branch_id` + project/branch names → RPC `branch_history` → parse live
expiration → upsert into storage keyed by `branch_id` → reflect success on the
button (e.g. "Tracked ✓").

**Flow C — once per day (service worker):**
`alarms` fires (and on startup) → read all tracked branches + `warningDays` →
for each branch expiring within `warningDays`, fire a notification → popup shows
the branch row highlighted red. Comparison is stored-date vs today; no RPC here.

## 8. File architecture (create this structure)

```
odoo-sh-tracker/
├── manifest.config.ts          # CRXJS defineManifest; cross-browser fields
├── vite.config.ts              # crx() plugin; chrome + firefox build targets
├── package.json                # scripts: dev, build, build:firefox, lint, typecheck
├── tsconfig.json
├── CLAUDE.md
├── .claude/docs/               # architectural_patterns.md, odoo-sh-integration.md, storage-schema.md
├── public/icons/               # extension icons
└── src/
    ├── background/
    │   └── service-worker.ts   # alarms + notifications; daily expiry check
    ├── content/
    │   ├── index.ts            # isolated world: page detection, bridge, SPA nav, storage writes
    │   └── track-button.ts     # inject/render the Track button + click handler
    ├── injected/
    │   └── odoo-reader.ts      # MAIN world: reads window.odoo, postMessage back
    ├── popup/
    │   ├── index.html
    │   ├── main.tsx
    │   └── App.tsx             # list of tracked branches, red highlight for expiring
    ├── options/
    │   ├── index.html
    │   ├── main.tsx
    │   └── App.tsx             # configurable warningDays
    └── shared/
        ├── types.ts            # TrackedBranch, Settings, message discriminated unions
        ├── storage.ts          # repository: upsertBranch, listBranches, removeBranch, get/setSettings
        ├── odoo-api.ts         # branch_history fetch + expiration parsing (anti-corruption)
        ├── messaging.ts        # typed helpers for postMessage bridge + runtime messaging
        ├── settings.ts         # warningDays get/set over storage
        └── date.ts             # daysUntil / isExpiringWithin helpers
```

## 9. Architectural conventions (apply consistently)

- **Two-world bridge:** all `window.odoo` reads happen only in
  `injected/odoo-reader.ts`; the content script talks to it through
  `shared/messaging.ts` with correlated, namespaced messages.
- **Storage repository:** no context calls `browser.storage` directly — only
  `shared/storage.ts` does. Everyone else imports its functions.
- **Anti-corruption layer:** the messy `window.odoo` / RPC shapes are converted
  to clean `TrackedBranch` domain objects inside `odoo-reader.ts` + `odoo-api.ts`;
  nothing downstream knows the raw shapes.
- **Typed messages:** every cross-context message is a member of a discriminated
  union in `shared/types.ts`.
- **Polyfill everywhere:** `import browser from "webextension-polyfill"`.

## 10. Deliverables & acceptance criteria

- Builds cleanly for both Chrome (`pnpm build`) and Firefox (`pnpm build:firefox`).
- Track button appears only on staging branch pages and survives SPA navigation.
- Clicking Track stores/updates the correct live expiration date (verify against
  a real branch).
- Daily alarm produces a notification for a branch whose stored expiry is within
  `warningDays`; popup highlights it red.
- Options page reads/writes `warningDays` and the daily check respects it.
- Also generate/refresh `CLAUDE.md` and `.claude/docs/*` to match the final code,
  converting the path+symbol references into real `file:line` references.

Ask me before making structural decisions that contradict this brief. Start by
scaffolding the CRXJS + React + TS project and the file tree above, then
implement Flow A → B → C in order.
