// Anti-corruption layer for the branch_history JSON-RPC endpoint. The raw
// response shape stays inside this module; callers only see ExpirationResult.
//
// Must be called from a content script running on odoo.sh: the request is
// same-origin there, so the session cookie authenticates it.

const BRANCH_HISTORY_URL = 'https://www.odoo.sh/project/json/branch_history'

type RawBuild = {
  expiration_date?: string | false
}

type RawTracking = {
  expiration_date?: string | false
  build?: RawBuild | false
}

type BranchHistoryResponse = {
  result?: { trackings?: RawTracking[] }
}

export type ExpirationResult =
  | { ok: true; expirationDate: string }
  | { ok: false; error: string }

/**
 * Parsing rule: take the first tracking (newest first) whose `expiration_date`
 * — falling back to `build.expiration_date` — is a truthy string. Dropped/old
 * builds carry `false`; a fresh push mid-build can leave the newest tracking
 * dateless, so index 0 is never assumed.
 */
export function parseExpirationDate(trackings: RawTracking[]): string | null {
  for (const tracking of trackings) {
    const date =
      tracking.expiration_date || (tracking.build ? tracking.build.expiration_date : undefined)
    if (typeof date === 'string' && date) return date
  }
  return null
}

export async function fetchBranchExpiration(branchId: number): Promise<ExpirationResult> {
  let payload: BranchHistoryResponse
  try {
    const response = await fetch(BRANCH_HISTORY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        id: 3,
        jsonrpc: '2.0',
        method: 'call',
        params: { branch_id: branchId, offset: 0 },
      }),
    })
    if (!response.ok) {
      return { ok: false, error: `branch_history returned HTTP ${response.status}` }
    }
    payload = (await response.json()) as BranchHistoryResponse
  } catch {
    return { ok: false, error: 'Could not reach branch_history' }
  }

  const expirationDate = parseExpirationDate(payload.result?.trackings ?? [])
  if (!expirationDate) {
    return { ok: false, error: "No live build — couldn't determine expiry" }
  }
  return { ok: true, expirationDate }
}
