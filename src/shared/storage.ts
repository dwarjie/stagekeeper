// Storage repository — the only module in any context that touches
// browser.storage. Everyone else imports these functions.
import browser from 'webextension-polyfill'
import type { Settings, TrackedBranch } from './types'

const BRANCHES_KEY = 'trackedBranches'
const SETTINGS_KEY = 'settings'

export const DEFAULT_SETTINGS: Settings = { warningDays: 1 }

type BranchMap = Record<string, TrackedBranch>

async function readBranchMap(): Promise<BranchMap> {
  const stored = await browser.storage.local.get(BRANCHES_KEY)
  return (stored[BRANCHES_KEY] as BranchMap | undefined) ?? {}
}

export type BranchUpsert = Omit<TrackedBranch, 'trackedAt' | 'updatedAt'>

/**
 * Upsert by `branchId`: existing records keep their `trackedAt` and get a fresh
 * `expirationDate`/`updatedAt` (how a rebuild's reset date is reconciled — the
 * user re-clicks Track; there is no background refresh).
 */
export async function upsertBranch(input: BranchUpsert): Promise<TrackedBranch> {
  const map = await readBranchMap()
  const now = new Date().toISOString()
  const existing = map[String(input.branchId)]
  const record: TrackedBranch = {
    ...input,
    trackedAt: existing?.trackedAt ?? now,
    updatedAt: now,
  }
  map[String(input.branchId)] = record
  await browser.storage.local.set({ [BRANCHES_KEY]: map })
  return record
}

/** All tracked branches, soonest expiry first. */
export async function listBranches(): Promise<TrackedBranch[]> {
  const map = await readBranchMap()
  return Object.values(map).sort((a, b) => a.expirationDate.localeCompare(b.expirationDate))
}

export async function getBranch(branchId: number): Promise<TrackedBranch | undefined> {
  const map = await readBranchMap()
  return map[String(branchId)]
}

export async function removeBranch(branchId: number): Promise<void> {
  const map = await readBranchMap()
  delete map[String(branchId)]
  await browser.storage.local.set({ [BRANCHES_KEY]: map })
}

export async function getSettings(): Promise<Settings> {
  const stored = await browser.storage.local.get(SETTINGS_KEY)
  const raw = stored[SETTINGS_KEY] as Partial<Settings> | undefined
  return { ...DEFAULT_SETTINGS, ...raw }
}

export async function setSettings(settings: Settings): Promise<void> {
  await browser.storage.local.set({ [SETTINGS_KEY]: settings })
}

/**
 * Fires after any change to this extension's local storage — branch upserts,
 * removals, or settings writes. Register at the top level in MV3 contexts so
 * the event wakes the service worker.
 */
export function onStorageMutated(callback: () => void): void {
  browser.storage.onChanged.addListener((_changes, areaName) => {
    if (areaName === 'local') callback()
  })
}
