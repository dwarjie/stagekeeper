# Odoo.sh Integration

Everything the extension knows about Odoo.sh internals. Captured from the live
app; keep this the single source of truth and confine consuming code to
`src/injected/odoo-reader.ts:25` (`resolveBranchInfo`) and
`src/shared/odoo-api.ts:41` (`fetchBranchExpiration`).

## URL shape
Branch pages look like:
`/project/<project>/branches/<branchName>/<page>`
e.g. `/project/mega-print/branches/staging/history`.
`<project>` and `<branchName>` are parsed from here
(`parseBranchFromPath`, `src/content/index.ts:19`); `branchId` is **not** in
the URL and must come from `window.odoo`.

## Reading `window.odoo` (MAIN world only)
Data lives at `window.odoo.__WOWL_DEBUG__.root.store`:

- `store.repo.project_name` → `"mega-print"`
- `store.repo.name` → `"mega_print_odoo"`
- `store.repo.branches[]` → each `{ id, name, stage, provider_url, ... }`

Resolve the current branch by matching `<branchName>` (from the URL) against
`store.repo.branches[].name`, then read `id` and `stage`. Only proceed when
`stage === "staging"`.

Defensive handling (fail quietly, no Track button):
- `window.odoo` / `__WOWL_DEBUG__` absent (non-odoo.sh page, or shape changed).
- No branch in `branches[]` matches the URL name.

## `branch_history` RPC
Call this from the content script while on `odoo.sh` so the session cookie is
sent (same-origin). No `access_token` needed.

```
POST https://www.odoo.sh/project/json/branch_history
Content-Type: application/json
credentials: "same-origin"

{ "id": 3, "jsonrpc": "2.0", "method": "call",
  "params": { "branch_id": <branchId>, "offset": 0 } }
```

Response (trimmed): `result.trackings` is an array, newest first. Each tracking:

```jsonc
{
  "id": 41765732,
  "tracking_type": "push",            // push | rebuild | import | ...
  "expiration_date": "2026-07-18",    // false on dropped/old builds
  "create_date": "2026-07-15 03:08:46",
  "build": {
    "id": 33717728,
    "status": ["done", "Done"],       // dropped builds → ["dropped", ...]
    "result": ["success", "Success"],
    "expiration_date": "2026-07-18",  // also false when dropped
    "stage": "staging",
    "url": "https://mega-print-staging-33717728.dev.odoo.com"
  },
  "commits": [ { "identifier": "...", "message": "..." } ]
}
```

## Expiration-parsing rule
Implemented in `parseExpirationDate` (`src/shared/odoo-api.ts:32`).
Iterate `result.trackings` and take the **first** tracking whose
`expiration_date` (fallback: `build.expiration_date`) is a truthy `"YYYY-MM-DD"`
string. Dropped/old builds carry `false`; only the live build has a real date.

Do **not** hard-code index 0 — a fresh push captured mid-build can leave the
newest tracking without a date yet. If no tracking has a truthy date, return a
"no live build / couldn't determine expiry" result instead of storing a guess.

## Notes / gotchas
- Retention is currently ~1 month; expiry ≈ live build `create_date` + 1 month,
  but always read the returned date rather than computing it.
- A **rebuild** resets the real expiration date. The extension intentionally
  refreshes the stored date only when the user clicks Track (upsert), not via a
  background job — see `storage-schema.md`.
