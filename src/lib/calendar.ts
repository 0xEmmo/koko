import { daysInMonth, parseDateKey, toDateKey, weekday, type DateKey } from './time'

/** Monday-first grid of weeks covering the month, padded with nulls. */
export function monthGrid(first: DateKey): (DateKey | null)[][] {
  const { year, month } = parseDateKey(first)
  const lead = (weekday(first) + 6) % 7
  const cells: (DateKey | null)[] = Array.from({ length: lead }, () => null)
  for (let d = 1; d <= daysInMonth(year, month); d++) cells.push(toDateKey(year, month, d))
  while (cells.length % 7) cells.push(null)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}
