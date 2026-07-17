import { useEffect, useState } from 'react'
import { Cross2Icon, GearIcon, LapTimerIcon } from '@radix-ui/react-icons'
import browser from 'webextension-polyfill'
import { daysUntil, isExpiringWithin } from '@/shared/date'
import { getWarningDays } from '@/shared/settings'
import { listBranches, removeBranch } from '@/shared/storage'
import type { TrackedBranch } from '@/shared/types'
import { Footer } from '@/shared/ui/Footer'

function badgeLabel(expirationDate: string): string {
  const days = daysUntil(expirationDate)
  if (Number.isNaN(days)) return '—'
  if (days < 0) return 'expired'
  if (days === 0) return 'today'
  return `${days}d left`
}

function expiryLabel(expirationDate: string): string {
  const days = daysUntil(expirationDate)
  if (Number.isNaN(days)) return expirationDate
  if (days < 0) return `expired ${-days} day${days === -1 ? '' : 's'} ago`
  if (days === 0) return 'expires today'
  if (days === 1) return 'expires tomorrow'
  return `expires in ${days} days`
}

export default function App() {
  const [branches, setBranches] = useState<TrackedBranch[]>([])
  const [warningDays, setWarningDays] = useState(1)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    void Promise.all([listBranches(), getWarningDays()]).then(([list, days]) => {
      setBranches(list)
      setWarningDays(days)
      setLoaded(true)
    })
  }, [])

  const handleRemove = async (branchId: number) => {
    await removeBranch(branchId)
    setBranches(await listBranches())
  }

  return (
    <main className="app popup">
      <header className="app-header">
        <div className="brand">
          <span className="brand-icon">
            <LapTimerIcon />
          </span>
          <div>
            <h1>Stagekeeper</h1>
            <span className="tagline">Odoo.sh staging expiry tracker</span>
          </div>
        </div>
        <button
          className="icon-button"
          title="Settings"
          onClick={() => void browser.runtime.openOptionsPage()}
        >
          <GearIcon />
        </button>
      </header>

      <section>
        <h2 className="section-label">Tracked branches</h2>

        {loaded && branches.length === 0 && (
          <div className="card empty">
            No tracked branches yet. Open an Odoo.sh staging branch and click{' '}
            <strong>Track</strong>.
          </div>
        )}

        <ul className="branches">
          {branches.map((branch) => (
            <li
              key={branch.branchId}
              className={`card ${isExpiringWithin(branch.expirationDate, warningDays) ? 'expiring' : ''}`}
            >
              <div className="branch-main">
                <a href={branch.branchUrl} target="_blank" rel="noreferrer">
                  {branch.projectName} / {branch.branchName}
                </a>
                <span className="expiry">
                  {branch.expirationDate} · {expiryLabel(branch.expirationDate)}
                </span>
              </div>
              <div className="branch-side">
                <span className="expiry-badge">{badgeLabel(branch.expirationDate)}</span>
                <button
                  className="icon-button"
                  title="Stop tracking"
                  onClick={() => void handleRemove(branch.branchId)}
                >
                  <Cross2Icon />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Footer />
    </main>
  )
}
