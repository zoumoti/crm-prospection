// src/features/dashboard/api.ts
//
// Pure aggregation helpers. No Supabase calls, no React. Each function takes
// raw rows from the DB + a `today` string and returns the shape consumed by
// its widget. Easy to reason about, easy to memoize.

import type { Invoice, Task, ProspectionSettings, Contact, ContactStage } from '@/types/database'
import { bucketize } from '@/features/crm/followup-buckets'
// PendingFollowup is exported from src/features/crm/api.ts (not from followup-buckets).
import type { PendingFollowup, CrmWeeklyCounts } from '@/features/crm/api'
import {
  getCurrentYearMonth,
  monthRange,
  previousMonth,
  lastNMonths,
} from './dates'

// ============================================================================
// Widget 1 — Revenues this month
// ============================================================================

export interface RevenueSparklinePoint {
  key: string
  label: string
  ht: number
}

export interface RevenueWidgetData {
  currentMonthHt: number
  previousMonthHt: number
  deltaPct: number | null            // null when previousMonthHt === 0
  isFirstRevenue: boolean            // true when previous === 0 && current > 0
  sparkline: RevenueSparklinePoint[]
  hasAnyHistory: boolean             // true if any month in sparkline > 0
}

export function computeRevenueWidget(invoices: Invoice[], _today: string): RevenueWidgetData {
  const { year, month } = getCurrentYearMonth()
  const prev = previousMonth(year, month)
  const curRange = monthRange(year, month)
  const prevRange = monthRange(prev.year, prev.month)

  const paid = invoices.filter(inv => inv.status === 'paid' && inv.paid_at != null)

  const sumInRange = (start: string, endExclusive: string) =>
    paid.reduce((acc, inv) => {
      const d = inv.paid_at!.slice(0, 10)  // 'YYYY-MM-DD' prefix of timestamptz
      return d >= start && d < endExclusive ? acc + Number(inv.total_ht) : acc
    }, 0)

  const currentMonthHt = round2(sumInRange(curRange.start, curRange.endExclusive))
  const previousMonthHt = round2(sumInRange(prevRange.start, prevRange.endExclusive))

  let deltaPct: number | null = null
  let isFirstRevenue = false
  if (previousMonthHt > 0) {
    deltaPct = Math.round(((currentMonthHt - previousMonthHt) / previousMonthHt) * 1000) / 10
  } else if (currentMonthHt > 0) {
    isFirstRevenue = true
  }

  const months = lastNMonths(6)
  const sparkline: RevenueSparklinePoint[] = months.map(m => {
    const r = monthRange(m.year, m.month)
    return {
      key: m.key,
      label: m.label,
      ht: round2(sumInRange(r.start, r.endExclusive)),
    }
  })
  const hasAnyHistory = sparkline.some(p => p.ht > 0)

  return {
    currentMonthHt,
    previousMonthHt,
    deltaPct,
    isFirstRevenue,
    sparkline,
    hasAnyHistory,
  }
}

// ============================================================================
// Widget 4 — Today's tasks (owner-assigned only)
// ============================================================================

export type TodayTaskBucket = 'overdue' | 'today' | 'high_no_date'

export interface TodayTasksWidgetItem {
  task: Task
  bucket: TodayTaskBucket
}

export interface TodayTasksWidgetData {
  items: TodayTasksWidgetItem[]   // capped to 5, already sorted
  totalCount: number              // overdue + today + high_no_date BEFORE cap
}

const TASKS_CAP = 5

export function computeTodayTasksWidget(tasks: Task[], today: string): TodayTasksWidgetData {
  const candidates = tasks.filter(t => t.assignee === 'owner' && !t.completed)
  const overdue: TodayTasksWidgetItem[] = []
  const todayBucket: TodayTasksWidgetItem[] = []
  const highNoDate: TodayTasksWidgetItem[] = []
  for (const t of candidates) {
    if (t.due_date != null && t.due_date < today) overdue.push({ task: t, bucket: 'overdue' })
    else if (t.due_date === today) todayBucket.push({ task: t, bucket: 'today' })
    else if (t.due_date == null && t.priority === 'high') highNoDate.push({ task: t, bucket: 'high_no_date' })
  }
  // Sort: overdue by due_date asc (oldest first), today by priority (high first) then created_at,
  // high_no_date by created_at asc.
  overdue.sort((a, b) => (a.task.due_date ?? '').localeCompare(b.task.due_date ?? ''))
  todayBucket.sort((a, b) => {
    const pri = priorityRank(b.task.priority) - priorityRank(a.task.priority)
    if (pri !== 0) return pri
    return a.task.created_at.localeCompare(b.task.created_at)
  })
  highNoDate.sort((a, b) => a.task.created_at.localeCompare(b.task.created_at))
  const all = [...overdue, ...todayBucket, ...highNoDate]
  return {
    items: all.slice(0, TASKS_CAP),
    totalCount: all.length,
  }
}

function priorityRank(p: Task['priority']): number {
  switch (p) {
    case 'high': return 2
    case 'normal': return 1
    case 'low': return 0
  }
}

// ============================================================================
// Widget 5 — Today's followups (overdue + today only)
// ============================================================================

export interface TodayFollowupsWidgetItem {
  followup: PendingFollowup
  bucket: 'overdue' | 'today'
}

export interface TodayFollowupsWidgetData {
  items: TodayFollowupsWidgetItem[]   // capped to 5
  overdueCount: number                // before cap
  todayCount: number
}

const FOLLOWUPS_CAP = 5

export function computeTodayFollowupsWidget(
  followups: PendingFollowup[],
  _today: string,
): TodayFollowupsWidgetData {
  const buckets = bucketize(followups)
  const overdue: TodayFollowupsWidgetItem[] = buckets.overdue.map(f => ({ followup: f, bucket: 'overdue' as const }))
  const todayItems: TodayFollowupsWidgetItem[] = buckets.today.map(f => ({ followup: f, bucket: 'today' as const }))
  // bucketize already sorts by scheduled_at asc within each bucket.
  const all = [...overdue, ...todayItems]
  return {
    items: all.slice(0, FOLLOWUPS_CAP),
    overdueCount: buckets.overdue.length,
    todayCount: buckets.today.length,
  }
}

// ============================================================================
// Widget 7 — CRM weekly goals (NEW v2)
// ============================================================================

export interface CrmGoalsWidgetData {
  messageGoal: number | null
  callGoal: number | null
  messagesThisWeek: number
  callsThisWeek: number
  /** New contacts moved to 'message_sent' today, net of corrections (see countMessagesSentToday) */
  messagesToday: number
  /** True when both goals are null in settings → render the empty/configure state */
  unconfigured: boolean
  /** True when every CONFIGURED goal is reached */
  allGoalsReached: boolean
}

export function computeCrmGoalsWidget(args: {
  settings: ProspectionSettings | null
  weeklyCounts: CrmWeeklyCounts | null
  messagesToday: number
}): CrmGoalsWidgetData {
  const messageGoal = args.settings?.weekly_message_goal ?? null
  const callGoal = args.settings?.weekly_call_goal ?? null
  const messagesThisWeek = args.weeklyCounts?.messages ?? 0
  const callsThisWeek = args.weeklyCounts?.calls ?? 0
  const messagesToday = args.messagesToday

  const unconfigured = messageGoal == null && callGoal == null

  // "All goals reached" = every CONFIGURED goal is met. If no goal is configured,
  // we already render the empty state, so this branch is reached only when at least
  // one goal exists. We treat an unconfigured side as "not blocking" (skipped).
  let allGoalsReached = false
  if (!unconfigured) {
    const msgOk = messageGoal == null || messagesThisWeek >= messageGoal
    const callOk = callGoal == null || callsThisWeek >= callGoal
    allGoalsReached = msgOk && callOk
  }

  return {
    messageGoal,
    callGoal,
    messagesThisWeek,
    callsThisWeek,
    messagesToday,
    unconfigured,
    allGoalsReached,
  }
}

// ============================================================================
// Widget 8 — CRM funnel (NEW v2)
// ============================================================================

export interface CrmFunnelStageData {
  stage: ContactStage
  /**
   * Cumulative — number of contacts who have **reached** this stage (i.e. their
   * current stage is this one or further down the funnel). A real funnel must
   * be cumulative; snapshot counts produce conversion rates > 100%.
   */
  count: number
  /** count[next]/count[this], rounded to integer %. null if last stage or count===0. Always ≤ 100% by construction. */
  conversionToNextPct: number | null
}

export interface CrmFunnelWidgetData {
  /** 6 active stages in canonical order (to_contact → closed_won) with cumulative counts. closed_lost excluded from the bands. */
  stages: CrmFunnelStageData[]
  /** Snapshot count of contacts currently in closed_lost (rendered as small annotation). Also folded into the `to_contact` cumulative count since they entered the funnel. */
  closedLostCount: number
  /** Lifetime: contacts whose stage has ever been past to_contact (= stage != 'to_contact') */
  everMessaged: number
  /** Lifetime: contacts currently in closed_won */
  everWon: number
  /** Lifetime ratio "messages per 1 win", null if everWon === 0 */
  messagesPerWin: number | null
  /** Max cumulative count — used to normalize bar widths in the UI (will always be the top stage). */
  maxCount: number
}

const ACTIVE_FUNNEL_STAGES: ContactStage[] = [
  'to_contact',
  'message_sent',
  'replied',
  'booking_link_sent',
  'call_booked',
  'closed_won',
]

export function computeCrmFunnelWidget(contacts: Contact[]): CrmFunnelWidgetData {
  // Cumulative count per active stage. A contact currently at stage index `i`
  // counts at every stage 0..i (they had to pass through to get there, under
  // the assumption of forward-only progression — true for our pipeline UI).
  // closed_lost contacts are counted at to_contact only: they entered the
  // funnel but without stage_change history we don't know how far they got.
  const stageIndex = new Map<ContactStage, number>()
  ACTIVE_FUNNEL_STAGES.forEach((s, i) => stageIndex.set(s, i))

  const cumulative = new Array<number>(ACTIVE_FUNNEL_STAGES.length).fill(0)
  let closedLostCount = 0
  for (const c of contacts) {
    if (c.stage === 'closed_lost') {
      closedLostCount += 1
      cumulative[0] += 1
      continue
    }
    const idx = stageIndex.get(c.stage)
    if (idx == null) continue
    for (let i = 0; i <= idx; i++) cumulative[i] += 1
  }

  const stages: CrmFunnelStageData[] = ACTIVE_FUNNEL_STAGES.map((stage, idx) => {
    const count = cumulative[idx]
    const nextStage = ACTIVE_FUNNEL_STAGES[idx + 1]
    let conversionToNextPct: number | null = null
    if (nextStage && count > 0) {
      conversionToNextPct = Math.round((cumulative[idx + 1] / count) * 100)
    }
    return { stage, count, conversionToNextPct }
  })

  const everMessaged = contacts.reduce(
    (acc, c) => (c.stage !== 'to_contact' ? acc + 1 : acc),
    0
  )
  const everWon = contacts.reduce(
    (acc, c) => (c.stage === 'closed_won' ? acc + 1 : acc),
    0
  )
  const messagesPerWin = everWon > 0 ? Math.round(everMessaged / everWon) : null
  const maxCount = stages.reduce((m, s) => Math.max(m, s.count), 0)

  return {
    stages,
    closedLostCount,
    everMessaged,
    everWon,
    messagesPerWin,
    maxCount,
  }
}

// ============================================================================
// Internals
// ============================================================================

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
