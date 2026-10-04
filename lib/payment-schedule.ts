const ALLOWED_INTERVALS = new Set([1, 2, 3, 6, 12])

function parseDate(date: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) throw new RangeError(`Invalid calendar date: ${date}`)

  const [, yearPart, monthPart, dayPart] = match
  const year = Number(yearPart)
  const month = Number(monthPart)
  const day = Number(dayPart)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new RangeError(`Invalid calendar date: ${date}`)
  }

  return { year, month, day }
}

export function addMonthsAtAnchor(date: string, intervalMonths: number, dueDay: number): string {
  const { year, month } = parseDate(date)
  if (!ALLOWED_INTERVALS.has(intervalMonths)) {
    throw new RangeError('Interval must be 1, 2, 3, 6, or 12 months')
  }
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
    throw new RangeError('Due day must be an integer from 1 to 31')
  }

  const monthStart = new Date(Date.UTC(year, month - 1 + intervalMonths, 1))
  const lastDay = new Date(Date.UTC(
    monthStart.getUTCFullYear(),
    monthStart.getUTCMonth() + 1,
    0,
  )).getUTCDate()
  const day = Math.min(dueDay, lastDay)
  return [
    String(monthStart.getUTCFullYear()).padStart(4, '0'),
    String(monthStart.getUTCMonth() + 1).padStart(2, '0'),
    String(day).padStart(2, '0'),
  ].join('-')
}

export function classifyDueDate(
  dueDate: string,
  today: string,
  isPaid: boolean,
): 'overdue' | 'upcoming' | 'paid' {
  parseDate(dueDate)
  parseDate(today)
  if (isPaid) return 'paid'
  return dueDate < today ? 'overdue' : 'upcoming'
}

export function monthlyDueDatesInWindow(today: string, dueDay: number, windowDays = 30): string[] {
  const { year, month } = parseDate(today)
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
    throw new RangeError('Due day must be an integer from 1 to 31')
  }
  if (!Number.isInteger(windowDays) || windowDays < 0) {
    throw new RangeError('Window must be a non-negative integer')
  }

  const windowEnd = new Date(Date.UTC(year, month - 1, Number(today.slice(-2)) + windowDays))
  const dates: string[] = []
  for (let offset = 0; offset <= Math.ceil(windowDays / 28) + 1; offset += 1) {
    const monthStart = new Date(Date.UTC(year, month - 1 + offset, 1))
    const lastDay = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)).getUTCDate()
    const date = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), Math.min(dueDay, lastDay)))
    if (date <= windowEnd) {
      dates.push([
        String(date.getUTCFullYear()).padStart(4, '0'),
        String(date.getUTCMonth() + 1).padStart(2, '0'),
        String(date.getUTCDate()).padStart(2, '0'),
      ].join('-'))
    }
  }
  return dates
}
