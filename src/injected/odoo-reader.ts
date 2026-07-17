// MAIN-world script, injected by the content script as a web-accessible
// resource. The only module allowed to touch `window.odoo`. It answers
// branch-info requests over the postMessage bridge and announces SPA route
// changes (the page router calls pushState/replaceState in this world, so the
// isolated content script could never observe them by patching its own copy).
import { isBridgeMessage, postBridgeMessage } from '@/shared/messaging'
import type { OdooBranchInfo } from '@/shared/types'

type WowlBranch = { id: number; name: string; stage: string }

type OdooGlobal = {
  __WOWL_DEBUG__?: {
    root?: {
      store?: {
        repo?: {
          project_name?: string
          name?: string
          branches?: WowlBranch[]
        }
      }
    }
  }
}

function resolveBranchInfo(branchName: string): OdooBranchInfo | null {
  const odoo = (window as Window & { odoo?: OdooGlobal }).odoo
  const repo = odoo?.__WOWL_DEBUG__?.root?.store?.repo
  if (!repo?.project_name || !repo.name || !Array.isArray(repo.branches)) return null

  const branch = repo.branches.find((candidate) => candidate.name === branchName)
  if (!branch) return null

  return {
    branchId: branch.id,
    projectName: repo.project_name,
    repoName: repo.name,
    branchName: branch.name,
    stage: branch.stage,
  }
}

window.addEventListener('message', (event) => {
  if (event.source !== window || !isBridgeMessage(event.data)) return
  const message = event.data
  if (message.type !== 'stagekeeper:branch-info:request') return

  const info = resolveBranchInfo(message.branchName)
  postBridgeMessage(
    info
      ? { type: 'stagekeeper:branch-info:response', id: message.id, ok: true, info }
      : {
          type: 'stagekeeper:branch-info:response',
          id: message.id,
          ok: false,
          error: 'Branch not found in window.odoo (store not ready or shape changed)',
        },
  )
})

function announceNavigation() {
  postBridgeMessage({ type: 'stagekeeper:navigation', href: window.location.href })
}

for (const method of ['pushState', 'replaceState'] as const) {
  const original = history[method]
  history[method] = function (this: History, ...args: Parameters<History['pushState']>) {
    original.apply(this, args)
    announceNavigation()
  }
}
window.addEventListener('popstate', announceNavigation)
