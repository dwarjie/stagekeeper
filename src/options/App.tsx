import { useEffect, useState } from 'react'
import { CheckIcon, LapTimerIcon } from '@radix-ui/react-icons'
import { getWarningDays, setWarningDays } from '@/shared/settings'
import { Footer } from '@/shared/ui/Footer'

export default function App() {
  const [days, setDays] = useState('1')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    void getWarningDays().then((value) => setDays(String(value)))
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const parsed = Number(days)
    if (!Number.isInteger(parsed) || parsed < 0) return
    await setWarningDays(parsed)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <main className="app options">
      <header className="app-header">
        <div className="brand">
          <span className="brand-icon">
            <LapTimerIcon />
          </span>
          <div>
            <h1>Stagekeeper</h1>
            <span className="tagline">Settings</span>
          </div>
        </div>
      </header>

      <section>
        <h2 className="section-label">Notifications</h2>
        <form className="card setting-card" onSubmit={(event) => void handleSubmit(event)}>
          <label htmlFor="warning-days">Warning threshold</label>
          <p className="hint">
            Warn this many days before a staging branch expires. The daily check sends a
            notification for any tracked branch within this window, and the popup highlights those
            branches red.
          </p>
          <div className="row">
            <input
              id="warning-days"
              className="text-input"
              type="number"
              min={0}
              step={1}
              value={days}
              onChange={(event) => setDays(event.target.value)}
            />
            <span className="unit">days</span>
            <button className="primary-button" type="submit">
              Save
            </button>
            {saved && (
              <span className="saved">
                <CheckIcon /> Saved
              </span>
            )}
          </div>
        </form>
      </section>

      <Footer />
    </main>
  )
}
