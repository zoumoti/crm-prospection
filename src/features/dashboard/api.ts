// src/features/dashboard/api.ts
//
// Pure aggregation helpers. No Supabase calls, no React. Each function takes
// raw rows from the DB + a `today` string and returns the shape consumed by
// its widget.

import type { ProspectionSettings, Contact, ContactStage } from '@/types/database'
import { bucketize } from '@/features/crm/followup-buckets'
import type { PendingFollowup, CrmWeeklyCounts } from '@/features/crm/api'

// ============================================================================
// Widget — Today's followups (overdue + today only)
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
  const all = [...overdue, ...todayItems]
  return {
    items: all.slice(0, FOLLOWUPS_CAP),
    overdueCount: buckets.overdue.length,
    todayCount: buckets.today.length,
  }
}

// ============================================================================
// Widget — CRM weekly goals
// ============================================================================

export interface CrmGoalsWidgetData {
  messageGoal: number | null
  callGoal: number | null
  messagesThisWeek: number
  callsThisWeek: number
  messagesToday: number
  unconfigured: boolean
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
// Widget — CRM funnel
// ============================================================================

export interface CrmFunnelStageData {
  stage: ContactStage
  count: number
  conversionToNextPct: number | null
}

export interface CrmFunnelWidgetData {
  stages: CrmFunnelStageData[]
  closedLostCount: number
  everMessaged: number
  everWon: number
  messagesPerWin: number | null
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
