import { startOfDay, endOfDay, addDays, isBefore, isAfter, isWithinInterval } from 'date-fns'
import type { PendingFollowup } from './api'

export type FollowupBucket = 'overdue' | 'today' | 'upcoming'

export interface BucketizedFollowups {
  overdue: PendingFollowup[]
  today: PendingFollowup[]
  upcoming: PendingFollowup[]
}

export function bucketize(followups: PendingFollowup[]): BucketizedFollowups {
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd   = endOfDay(now)
  const tomorrowStart = startOfDay(addDays(now, 1))

  const overdue: PendingFollowup[] = []
  const today: PendingFollowup[] = []
  const upcoming: PendingFollowup[] = []

  for (const f of followups) {
    const at = new Date(f.scheduled_at)
    if (isBefore(at, todayStart)) overdue.push(f)
    else if (isWithinInterval(at, { start: todayStart, end: todayEnd })) today.push(f)
    else if (isAfter(at, tomorrowStart) || at.getTime() === tomorrowStart.getTime()) upcoming.push(f)
    // Anything between todayEnd and tomorrowStart (~midnight edge) lands in `today`.
  }
  return { overdue, today, upcoming }
}

export function isValidBucket(s: string | null): s is FollowupBucket {
  return s === 'overdue' || s === 'today' || s === 'upcoming'
}

export function parseBucket(s: string | null, fallback: FollowupBucket = 'today'): FollowupBucket {
  return isValidBucket(s) ? s : fallback
}
