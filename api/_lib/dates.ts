// api/_lib/dates.ts
// Paris-timezone date helpers for server-side use. Mirrors the logic
// in src/features/dashboard/dates.ts but standalone — we can't import
// across the tsconfig boundary without bundle gymnastics. The two files
// must stay aligned semantically.

/** Current hour 0-23 in Europe/Paris (DST-safe via Intl). */
export function getCurrentParisHour(): number {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    hour: 'numeric',
    hour12: false,
  })
  const formatted = fmt.format(new Date())
  // en-GB hour with hour12:false returns either "07" or "24" for midnight;
  // normalize 24 → 0.
  const n = Number(formatted)
  return n === 24 ? 0 : n
}

/** YYYY-MM-DD string in Europe/Paris for the given date. */
export function formatParisYmd(d: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
  return fmt.format(d)  // en-CA → "YYYY-MM-DD"
}

/** Human-readable date in French, ex. "jeudi 14 mai". */
export function formatParisFrenchDate(d: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'long', day: 'numeric', month: 'long',
  })
  return fmt.format(d)
}

/** Day number in the ISO week (Mon=1 ... Sun=7) for the given date in Paris. */
export function parisWeekDayNumber(d: Date = new Date()): number {
  // Intl with weekday:'long' would give us the name; we want a number.
  // Use the en-US numeric weekday (Sun=1...Sat=7) then convert to ISO (Mon=1...Sun=7).
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    weekday: 'short',
  })
  const wk = fmt.format(d)  // "Mon", "Tue", ...
  const map: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }
  return map[wk] ?? 1
}

/** ISO UTC string for 00:00:00 Europe/Paris of the given calendar date.
 *  Used as `.gte()` filter bound for "today in Paris" semantics. */
export function parisDateStartToUtcIso(d: Date = new Date()): string {
  const ymd = formatParisYmd(d)
  return parisLocalToUtcIso(`${ymd}T00:00:00`)
}

/** ISO UTC string for 23:59:59.999 Europe/Paris of the given calendar date.
 *  Used as `.lte()` filter bound for "today in Paris" semantics. */
export function parisDateEndToUtcIso(d: Date = new Date()): string {
  const ymd = formatParisYmd(d)
  return parisLocalToUtcIso(`${ymd}T23:59:59.999`)
}

/** ISO UTC string for the start of the ISO week (Monday 00:00 Europe/Paris). */
export function getWeekStartUtcIso(now: Date = new Date()): string {
  const day = parisWeekDayNumber(now)  // 1..7
  const ymd = formatParisYmd(now)
  // Build a Date from the Paris-local YMD, subtract (day-1) days at UTC level
  const [y, m, d] = ymd.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d - (day - 1)))
  const targetYmd = `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, '0')}-${String(utc.getUTCDate()).padStart(2, '0')}`
  return parisLocalToUtcIso(`${targetYmd}T00:00:00`)
}

/** Convert a Paris-local datetime string ('YYYY-MM-DDTHH:mm:ss[.fff]') to a UTC ISO string.
 *  Uses the Intl machinery to get the right offset (DST-safe). */
function parisLocalToUtcIso(parisLocal: string): string {
  // Trick: construct a Date from the string interpreted as UTC, then
  // adjust by the Paris offset for that instant.
  // 1. Pretend the local string is UTC: `${s}Z` parses to a candidate Date.
  const candidate = new Date(`${parisLocal}Z`)
  // 2. Compute Paris offset (minutes) for that candidate using getTimezoneOffset trick:
  const parisOffsetMs = getParisOffsetMs(candidate)
  // 3. Real UTC = candidate - offset (offset is positive in summer, negative never for Paris).
  const real = new Date(candidate.getTime() - parisOffsetMs)
  return real.toISOString()
}

function getParisOffsetMs(d: Date): number {
  // Format d as Europe/Paris and as UTC, diff the two interpretations.
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(d)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const parisAsUtcCandidate = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  )
  return parisAsUtcCandidate - d.getTime()
}
