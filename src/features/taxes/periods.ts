import type { TaxPeriodType } from '@/types/database'

export interface Period {
  type: TaxPeriodType
  year: number
  index: number  // 1..12 monthly, 1..4 quarterly
}

const MONTH_LABELS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const QUARTER_MONTHS_FR: Record<number, string> = {
  1: 'Janvier · Février · Mars',
  2: 'Avril · Mai · Juin',
  3: 'Juillet · Août · Septembre',
  4: 'Octobre · Novembre · Décembre',
}

export function getCurrentPeriod(today: Date, frequency: TaxPeriodType): Period {
  const year = today.getFullYear()
  if (frequency === 'monthly') {
    return { type: 'monthly', year, index: today.getMonth() + 1 }
  }
  return { type: 'quarterly', year, index: Math.floor(today.getMonth() / 3) + 1 }
}

export function previousPeriod(p: Period): Period {
  if (p.type === 'monthly') {
    return p.index === 1
      ? { type: 'monthly', year: p.year - 1, index: 12 }
      : { type: 'monthly', year: p.year, index: p.index - 1 }
  }
  return p.index === 1
    ? { type: 'quarterly', year: p.year - 1, index: 4 }
    : { type: 'quarterly', year: p.year, index: p.index - 1 }
}

export function nextPeriod(p: Period): Period {
  if (p.type === 'monthly') {
    return p.index === 12
      ? { type: 'monthly', year: p.year + 1, index: 1 }
      : { type: 'monthly', year: p.year, index: p.index + 1 }
  }
  return p.index === 4
    ? { type: 'quarterly', year: p.year + 1, index: 1 }
    : { type: 'quarterly', year: p.year, index: p.index + 1 }
}

/**
 * Build the list of periods from `from` (inclusive) up to `to` (inclusive),
 * for the given frequency. Returns oldest first (caller can reverse).
 */
export function listPeriodsBetween(from: Date, to: Date, frequency: TaxPeriodType): Period[] {
  const result: Period[] = []
  let cur = getCurrentPeriod(from, frequency)
  const end = getCurrentPeriod(to, frequency)
  while (
    cur.year < end.year ||
    (cur.year === end.year && cur.index <= end.index)
  ) {
    result.push(cur)
    cur = nextPeriod(cur)
  }
  return result
}

/** Returns { start: 'YYYY-MM-DD', endExclusive: 'YYYY-MM-DD' } for the period. */
export function periodRange(p: Period): { start: string; endExclusive: string } {
  if (p.type === 'monthly') {
    const m = p.index
    const ny = m === 12 ? p.year + 1 : p.year
    const nm = m === 12 ? 1 : m + 1
    return {
      start: `${p.year}-${String(m).padStart(2, '0')}-01`,
      endExclusive: `${ny}-${String(nm).padStart(2, '0')}-01`,
    }
  }
  // quarterly: index 1 → Jan, 2 → Apr, 3 → Jul, 4 → Oct
  const startMonth = (p.index - 1) * 3 + 1
  const endMonthExclusive = startMonth + 3  // 4, 7, 10, 13
  const ny = endMonthExclusive > 12 ? p.year + 1 : p.year
  const em = endMonthExclusive > 12 ? endMonthExclusive - 12 : endMonthExclusive
  return {
    start: `${p.year}-${String(startMonth).padStart(2, '0')}-01`,
    endExclusive: `${ny}-${String(em).padStart(2, '0')}-01`,
  }
}

/** Deadline = last day of the month following the period end. */
export function periodDeadline(p: Period): Date {
  const { endExclusive } = periodRange(p)
  // endExclusive = first day of the month right after the period.
  // The deadline is the last day of THAT month (= one month after period end).
  const [y, m] = endExclusive.split('-').map(Number)
  // Last day of month m of year y = day 0 of month m+1.
  return new Date(Date.UTC(y, m, 0))
}

/** Stable string key for UI (lookup snapshots, list highlighting). */
export function periodKey(p: Period): string {
  if (p.type === 'monthly') {
    return `${p.year}-M${String(p.index).padStart(2, '0')}`
  }
  return `${p.year}-Q${p.index}`
}

export function formatPeriodLabel(p: Period): string {
  if (p.type === 'monthly') {
    return `${MONTH_LABELS_FR[p.index - 1]} ${p.year}`
  }
  return `T${p.index} ${p.year} — ${QUARTER_MONTHS_FR[p.index]}`
}

export function formatPeriodDeadline(p: Period): string {
  const d = periodDeadline(p)
  const day = d.getUTCDate()
  const month = MONTH_LABELS_FR[d.getUTCMonth()].toLowerCase()
  const year = d.getUTCFullYear()
  return `${day} ${month} ${year}`
}
