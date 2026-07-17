const MS_PER_DAY = 86_400_000

/**
 * Whole days from today (local midnight) until a "YYYY-MM-DD" date.
 * 0 = expires today, negative = already past. NaN for unparseable input.
 */
export function daysUntil(dateStr: string, from: Date = new Date()): number {
  const [year, month, day] = dateStr.split('-').map(Number)
  const target = new Date(year, (month ?? 1) - 1, day ?? 1).getTime()
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()
  return Math.round((target - today) / MS_PER_DAY)
}

/** True when the date is within `days` from today — including today and already-expired dates. */
export function isExpiringWithin(dateStr: string, days: number, from?: Date): boolean {
  return daysUntil(dateStr, from) <= days
}
