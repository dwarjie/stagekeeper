// Renders the floating Track button on staging branch pages and handles
// Flow B: click → branch_history RPC → upsert into storage.
import { fetchBranchExpiration } from '@/shared/odoo-api'
import { getBranch, upsertBranch } from '@/shared/storage'
import type { OdooBranchInfo } from '@/shared/types'

const CONTAINER_ID = 'stagekeeper-track'

export type TrackTarget = {
  info: OdooBranchInfo
  branchUrl: string
}

let container: HTMLDivElement | null = null
let mountedBranchId: number | null = null

export function unmountTrackButton() {
  container?.remove()
  container = null
  mountedBranchId = null
}

export function mountTrackButton(target: TrackTarget) {
  if (mountedBranchId === target.info.branchId) return
  unmountTrackButton()
  mountedBranchId = target.info.branchId

  container = document.createElement('div')
  container.id = CONTAINER_ID
  Object.assign(container.style, {
    position: 'fixed',
    bottom: '16px',
    right: '16px',
    zIndex: '2147483647',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    background: '#714B67',
    color: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    font: '13px/1.4 system-ui, sans-serif',
  } satisfies Partial<CSSStyleDeclaration>)

  const button = document.createElement('button')
  Object.assign(button.style, {
    padding: '4px 10px',
    background: '#fff',
    color: '#714B67',
    border: 'none',
    borderRadius: '6px',
    font: 'inherit',
    fontWeight: '600',
    cursor: 'pointer',
  } satisfies Partial<CSSStyleDeclaration>)
  button.textContent = 'Track'

  const status = document.createElement('span')
  status.textContent = `${target.info.projectName} / ${target.info.branchName}`

  button.addEventListener('click', () => void handleTrackClick(target, button, status))

  container.append(status, button)
  document.body.appendChild(container)

  // If already tracked, show it (re-clicking Track still refreshes the date).
  void getBranch(target.info.branchId).then((existing) => {
    if (existing && mountedBranchId === target.info.branchId) {
      button.textContent = 'Tracked ✓'
      status.textContent = `Expires ${existing.expirationDate}`
    }
  })
}

async function handleTrackClick(
  target: TrackTarget,
  button: HTMLButtonElement,
  status: HTMLSpanElement,
) {
  button.disabled = true
  button.textContent = 'Tracking…'

  const result = await fetchBranchExpiration(target.info.branchId)
  button.disabled = false

  if (!result.ok) {
    button.textContent = 'Retry'
    status.textContent = result.error
    return
  }

  await upsertBranch({
    branchId: target.info.branchId,
    projectName: target.info.projectName,
    repoName: target.info.repoName,
    branchName: target.info.branchName,
    expirationDate: result.expirationDate,
    branchUrl: target.branchUrl,
  })

  button.textContent = 'Tracked ✓'
  status.textContent = `Expires ${result.expirationDate}`
}
