// Isolated-world content script: injects the MAIN-world reader, detects
// staging branch pages (re-evaluating on SPA route changes announced by the
// reader), and mounts/unmounts the Track button.
import browser from 'webextension-polyfill'
import readerUrl from '../injected/odoo-reader?script&module'
import { onBridgeMessage, requestBranchInfo } from '@/shared/messaging'
import { mountTrackButton, unmountTrackButton } from './track-button'

const STORE_READY_ATTEMPTS = 10
const STORE_READY_RETRY_MS = 500

function injectReader() {
  const script = document.createElement('script')
  script.type = 'module'
  script.src = browser.runtime.getURL(readerUrl)
  ;(document.head ?? document.documentElement).appendChild(script)
}

function parseBranchFromPath(pathname: string): { projectSlug: string; branchName: string } | null {
  const match = pathname.match(/^\/project\/([^/]+)\/branches\/([^/]+)/)
  if (!match) return null
  return { projectSlug: match[1], branchName: decodeURIComponent(match[2]) }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Monotonic token so a slow evaluation abandoned mid-retry can't clobber the
// button state of a newer navigation.
let evaluationToken = 0

async function evaluatePage() {
  const token = ++evaluationToken

  const parsed = parseBranchFromPath(window.location.pathname)
  if (!parsed) {
    unmountTrackButton()
    return
  }

  // On a fresh load the WOWL store may not be populated yet — retry briefly.
  for (let attempt = 0; attempt < STORE_READY_ATTEMPTS; attempt++) {
    const result = await requestBranchInfo(parsed.branchName)
    if (token !== evaluationToken) return

    if (result.ok) {
      if (result.info.stage === 'staging') {
        mountTrackButton({
          info: result.info,
          branchUrl: `${window.location.origin}/project/${parsed.projectSlug}/branches/${parsed.branchName}`,
        })
      } else {
        unmountTrackButton()
      }
      return
    }

    await sleep(STORE_READY_RETRY_MS)
    if (token !== evaluationToken) return
  }

  unmountTrackButton()
}

injectReader()
onBridgeMessage((message) => {
  if (message.type === 'stagekeeper:navigation') void evaluatePage()
})
void evaluatePage()
