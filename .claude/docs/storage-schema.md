# Storage Schema

All persistence is in `browser.storage.local` and accessed only through
`src/shared/storage.ts` (see the storage-repository pattern in
`architectural_patterns.md`). Records live under two keys: `trackedBranches`
(a `Record<branchId, TrackedBranch>`) and `settings` (`storage.ts:6`).

## Records

### Tracked branches

Keyed by `branchId` (globally unique on Odoo.sh, and human names can change).

```ts
type TrackedBranch = {
	branchId: number; // unique key
	projectName: string; // "sample-project"
	repoName: string; // "sample_project_odoo"
	branchName: string; // "staging"
	expirationDate: string; // "YYYY-MM-DD" (live build's date)
	branchUrl: string; // odoo.sh URL to the branch
	trackedAt: string; // ISO timestamp of first track
	updatedAt: string; // ISO timestamp of last upsert
};
```

### Settings

Stored under a separate key:

```ts
type Settings = {
	warningDays: number; // notify/highlight when expiry is within N days
};
// default: { warningDays: 1 }
```

## Upsert-on-Track behaviour

When Track is clicked, `upsertBranch` (`src/shared/storage.ts:25`) looks up the
record by `branchId`:

- **Exists** → overwrite `expirationDate` and `updatedAt`, keep `trackedAt`.
- **Absent** → insert with `trackedAt = updatedAt = now`.

This is deliberately the _only_ moment the stored expiration date changes. A
rebuild on Odoo.sh resets the real expiration, and the user reconciles that by
re-clicking Track; there is no background RPC refresh. Keeping this single
write-path avoids stale-vs-live ambiguity.

## Consumers

- Write: `src/content/track-button.ts:76` (`handleTrackClick`, via
  `upsertBranch`).
- Read: `src/popup/App.tsx` (`listBranches`/`removeBranch`),
  `src/content/track-button.ts:23` (`getBranch`, to show "Tracked ✓" on mount)
  and `src/background/service-worker.ts:50` (daily check + toolbar badge,
  which also subscribes via `onStorageMutated`, `storage.ts:71`).
- Settings: written by `src/options/App.tsx`, read by popup + service worker via
  `src/shared/settings.ts:6` (`getWarningDays`).

## Expiry evaluation

Never done inline. Use `daysUntil` (`src/shared/date.ts:7`) and
`isExpiringWithin` (`date.ts:15`) so the popup's red highlighting and the
background notification logic agree on the definition of "expiring within
`warningDays`".
