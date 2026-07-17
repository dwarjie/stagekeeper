// Flow C: once per day (alarm + on startup), compare every stored expiration
// date against warningDays and notify. No RPC here — dates only change when
// the user clicks Track.
import browser from 'webextension-polyfill'
import { daysUntil, isExpiringWithin } from '@/shared/date'
import { getWarningDays } from '@/shared/settings'
import { getBranch, listBranches, onStorageMutated } from '@/shared/storage'
import type { TrackedBranch } from '@/shared/types'

const ALARM_NAME = 'stagekeeper-daily-check'
const NOTIFICATION_PREFIX = 'stagekeeper:'

async function ensureAlarm() {
  const existing = await browser.alarms.get(ALARM_NAME)
  if (!existing) {
    browser.alarms.create(ALARM_NAME, { periodInMinutes: 1440, delayInMinutes: 1 })
  }
}

function expiryPhrase(expirationDate: string): string {
  const days = daysUntil(expirationDate)
  if (days < 0) return `expired on ${expirationDate}`
  if (days === 0) return `expires today (${expirationDate})`
  if (days === 1) return `expires tomorrow (${expirationDate})`
  return `expires in ${days} days (${expirationDate})`
}

async function notifyBranch(branch: TrackedBranch) {
  await browser.notifications.create(`${NOTIFICATION_PREFIX}${branch.branchId}`, {
    type: 'basic',
    iconUrl: browser.runtime.getURL('public/logo.png'),
    title: 'Stagekeeper — staging branch expiring',
    message: `${branch.projectName} / ${branch.branchName} ${expiryPhrase(branch.expirationDate)}. Back it up or rebuild before it is dropped.`,
  })
}

/** Toolbar badge: number of tracked branches inside the warning window. */
async function updateBadge() {
  const [branches, warningDays] = await Promise.all([listBranches(), getWarningDays()])
  const expiring = branches.filter((branch) =>
    isExpiringWithin(branch.expirationDate, warningDays),
  ).length

  await browser.action.setBadgeText({ text: expiring > 0 ? String(expiring) : '' })
  if (expiring > 0) {
    await browser.action.setBadgeBackgroundColor({ color: '#f0556a' })
  }
}

async function runDailyCheck() {
  const [branches, warningDays] = await Promise.all([listBranches(), getWarningDays()])

  for (const branch of branches) {
    if (!isExpiringWithin(branch.expirationDate, warningDays)) continue
    await notifyBranch(branch)
  }
}

browser.runtime.onInstalled.addListener(() => {
  void ensureAlarm()
  void runDailyCheck()
  void updateBadge()
})

browser.runtime.onStartup.addListener(() => {
  void ensureAlarm()
  void runDailyCheck()
  void updateBadge()
})

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    void runDailyCheck()
    void updateBadge()
  }
})

// Tracking, untracking, or changing warningDays refreshes the badge instantly.
onStorageMutated(() => void updateBadge())

// Clicking a notification opens the branch page.
browser.notifications.onClicked.addListener((notificationId) => {
  if (!notificationId.startsWith(NOTIFICATION_PREFIX)) return
  void (async () => {
    const branch = await getBranch(Number(notificationId.slice(NOTIFICATION_PREFIX.length)))
    if (branch) await browser.tabs.create({ url: branch.branchUrl })
    await browser.notifications.clear(notificationId)
  })()
})
