// Typed helpers for the postMessage bridge between the MAIN-world reader
// (src/injected/odoo-reader.ts) and the isolated content script. This module
// must stay importable from both worlds, so it must never import
// webextension-polyfill.
import type { BridgeMessage, OdooBranchInfo } from './types'

const NAMESPACE_PREFIX = 'stagekeeper:'

export function isBridgeMessage(data: unknown): data is BridgeMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as { type?: unknown }).type === 'string' &&
    (data as { type: string }).type.startsWith(NAMESPACE_PREFIX)
  )
}

export function postBridgeMessage(message: BridgeMessage): void {
  window.postMessage(message, window.location.origin)
}

/** Listen for bridge messages from this same window. Returns an unsubscribe. */
export function onBridgeMessage(handler: (message: BridgeMessage) => void): () => void {
  const listener = (event: MessageEvent) => {
    if (event.source !== window || !isBridgeMessage(event.data)) return
    handler(event.data)
  }
  window.addEventListener('message', listener)
  return () => window.removeEventListener('message', listener)
}

export type BranchInfoResult =
  | { ok: true; info: OdooBranchInfo }
  | { ok: false; error: string }

/**
 * Content-script side of the bridge: ask the MAIN-world reader to resolve the
 * given branch name against `window.odoo`. Resolves `ok: false` on timeout
 * (reader not injected yet, or the page store not ready).
 */
export function requestBranchInfo(branchName: string, timeoutMs = 2000): Promise<BranchInfoResult> {
  return new Promise((resolve) => {
    const id = crypto.randomUUID()

    const stop = onBridgeMessage((message) => {
      if (message.type !== 'stagekeeper:branch-info:response' || message.id !== id) return
      cleanup()
      resolve(message.ok ? { ok: true, info: message.info } : { ok: false, error: message.error })
    })
    const timer = setTimeout(() => {
      cleanup()
      resolve({ ok: false, error: 'Timed out waiting for the page bridge' })
    }, timeoutMs)

    function cleanup() {
      stop()
      clearTimeout(timer)
    }

    postBridgeMessage({ type: 'stagekeeper:branch-info:request', id, branchName })
  })
}
