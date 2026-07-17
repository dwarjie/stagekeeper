// warningDays get/set over the storage repository.
import { DEFAULT_SETTINGS, getSettings, setSettings } from './storage'

export { DEFAULT_SETTINGS }

export async function getWarningDays(): Promise<number> {
  return (await getSettings()).warningDays
}

export async function setWarningDays(warningDays: number): Promise<void> {
  await setSettings({ warningDays })
}
