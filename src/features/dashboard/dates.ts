// src/features/dashboard/dates.ts
//
// All helpers anchored on Europe/Paris. Outputs are strings in 'YYYY-MM-DD'
// or composed shapes — never a Date object that callers must format.
// Applies lessons/12-05 (timezone-safe) and 13-05 (memoizable string keys).

const MONTH_LABELS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

/** Today as 'YYYY-MM-DD' in Europe/Paris. */
export function getTodayISO(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** Year+month components in Europe/Paris. */
export function getCurrentYearMonth(): { year: number; month: number } {
  const iso = getTodayISO()
  const [y, m] = iso.split('-').map(Number)
  return { year: y, month: m }
}

/** Start (inclusive) and endExclusive of a given calendar month, as 'YYYY-MM-DD'. */
export function monthRange(year: number, month: number): { start: string; endExclusive: string } {
  const ny = month === 12 ? year + 1 : year
  const nm = month === 12 ? 1 : month + 1
  return {
    start: `${year}-${String(month).padStart(2, '0')}-01`,
    endExclusive: `${ny}-${String(nm).padStart(2, '0')}-01`,
  }
}

/** Previous month (year-aware). */
export function previousMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) return { year: year - 1, month: 12 }
  return { year, month: month - 1 }
}

/** N most recent months, oldest first. Index 0 = N-1 months ago, index N-1 = current. */
export function lastNMonths(n: number): { year: number; month: number; key: string; label: string }[] {
  const { year, month } = getCurrentYearMonth()
  const result: { year: number; month: number; key: string; label: string }[] = []
  let y = year
  let m = month
  for (let i = 0; i < n; i++) {
    result.unshift({
      year: y,
      month: m,
      key: `${y}-${String(m).padStart(2, '0')}`,
      label: MONTH_LABELS_FR[m - 1].slice(0, 3),  // 'Jan', 'Fév', ...
    })
    const prev = previousMonth(y, m)
    y = prev.year
    m = prev.month
  }
  return result
}

/** Convert a UTC ISO timestamp to its Europe/Paris calendar date (YYYY-MM-DD). */
export function parisDateFromIso(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

const WEEKDAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

/** 'Mercredi 13 mai 2026' — capitalized French long date. */
export function frenchLongDate(today: string): string {
  const [y, m, d] = today.split('-').map(Number)
  // Day-of-week from UTC midnight of that date (date-only, no TZ ambiguity)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return `${WEEKDAYS_FR[dow]} ${d} ${MONTH_LABELS_FR[m - 1].toLowerCase()} ${y}`
}

/**
 * Relative French label vs today.
 *   diff == 0   → "aujourd'hui"
 *   diff == 1   → "demain"
 *   diff > 1    → "dans N j"
 *   diff == -1  → "hier"
 *   diff < -1   → "il y a N j"
 */
export function relativeDaysLabel(fromDate: string, today: string): string {
  const diff = daysBetween(today, fromDate)  // fromDate - today
  if (diff === 0) return "aujourd'hui"
  if (diff === 1) return 'demain'
  if (diff === -1) return 'hier'
  if (diff > 0) return `dans ${diff} j`
  return `il y a ${Math.abs(diff)} j`
}

/** Signed difference (b - a) in calendar days. Both inputs are 'YYYY-MM-DD'. */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  const aUtc = Date.UTC(ay, am - 1, ad)
  const bUtc = Date.UTC(by, bm - 1, bd)
  return Math.round((bUtc - aUtc) / 86_400_000)
}

/**
 * Monday of the current ISO week, as 'YYYY-MM-DD' in Europe/Paris.
 *
 * Uses the same Paris-anchored strategy as getTodayISO. We extract the
 * Paris-local day-of-week, then go back N days where N = (paris_dow + 6) % 7.
 *   - Paris Monday (JS getDay = 1) → N = 0 → today
 *   - Paris Sunday (JS getDay = 0) → N = 6 → 6 days back
 */
export function getWeekStartISO(): string {
  const today = getTodayISO()
  const [y, m, d] = today.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  const back = (dow + 6) % 7
  const monday = new Date(Date.UTC(y, m - 1, d - back))
  const my = monday.getUTCFullYear()
  const mm = String(monday.getUTCMonth() + 1).padStart(2, '0')
  const md = String(monday.getUTCDate()).padStart(2, '0')
  return `${my}-${mm}-${md}`
}

/**
 * Convert a 'YYYY-MM-DD' (Paris-local calendar date) into a UTC ISO
 * timestamp string anchored at 00:00:00 Paris time on that day. DST-safe.
 *
 * Used to build the lower bound of `.gte('created_at', ...)` Supabase
 * filters when comparing against Paris-local "since start of period" times.
 *
 * Example (summer, CEST = UTC+2): '2026-05-11' → '2026-05-10T22:00:00.000Z'
 * Example (winter, CET  = UTC+1): '2026-01-12' → '2026-01-11T23:00:00.000Z'
 */
export function parisDateStartToUtcIso(parisYmd: string): string {
  const [y, m, d] = parisYmd.split('-').map(Number)
  const probe = new Date(Date.UTC(y, m - 1, d, 0, 0, 0))
  const parisHour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Paris',
      hour12: false,
      hour: '2-digit',
    }).format(probe)
  )
  // parisHour = the time Paris shows at UTC midnight = the Paris offset
  // (1 in winter, 2 in summer). The UTC instant that shows as 00:00 in
  // Paris is `parisHour` hours before our probe.
  return new Date(Date.UTC(y, m - 1, d, -parisHour, 0, 0)).toISOString()
}

const MONTH_SHORT_FR = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
]

/**
 * Day number within the ISO week, 1 (Monday) through 7 (Sunday).
 * Both inputs are 'YYYY-MM-DD'.
 */
export function weekDayNumber(today: string, weekStart: string): number {
  return daysBetween(weekStart, today) + 1
}

/**
 * Human-readable French range for an ISO week starting on `weekStart`.
 *   '2026-05-11' (week Mon-Sun) → '11 au 17 mai'
 *   '2026-04-27' (crosses month) → '27 avr. au 3 mai'
 *   '2025-12-29' (crosses year) → '29 déc. 2025 au 4 janv. 2026'
 */
export function frenchWeekRange(weekStart: string): string {
  const [wsY, wsM, wsD] = weekStart.split('-').map(Number)
  const endUtc = new Date(Date.UTC(wsY, wsM - 1, wsD + 6))
  const endY = endUtc.getUTCFullYear()
  const endM = endUtc.getUTCMonth() + 1
  const endD = endUtc.getUTCDate()
  if (wsY === endY && wsM === endM) {
    return `${wsD} au ${endD} ${MONTH_SHORT_FR[wsM - 1]}`
  }
  if (wsY === endY) {
    return `${wsD} ${MONTH_SHORT_FR[wsM - 1]} au ${endD} ${MONTH_SHORT_FR[endM - 1]}`
  }
  return `${wsD} ${MONTH_SHORT_FR[wsM - 1]} ${wsY} au ${endD} ${MONTH_SHORT_FR[endM - 1]} ${endY}`
}
