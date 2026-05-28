// api/daily-recap.ts
// Vercel cron endpoint. Triggered every hour at HH:00 UTC.
// Filters users by daily_recap_enabled + matches current Paris hour.
// Sends each matching user their morning recap via Telegram.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { env } from './_lib/env.js'
import { supabaseAdmin } from './_lib/supabase-admin.js'
import { sendMessage } from './_lib/telegram.js'
import { buildRecapMessage } from './_lib/recap-builder.js'
import {
  getCurrentParisHour,
  formatParisFrenchDate,
  parisWeekDayNumber,
  parisDateStartToUtcIso,
  parisDateEndToUtcIso,
  formatParisYmd,
  getWeekStartUtcIso,
} from './_lib/dates.js'

type Target = {
  user_id: string
  telegram_chat_id: string
  weekly_message_goal: number | null
  weekly_call_goal: number | null
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // 1. Auth
  if (req.headers['authorization'] !== `Bearer ${env.CRON_SECRET}`) {
    res.status(401).send('Unauthorized')
    return
  }

  // 2. Determine current Paris hour
  const parisHour = getCurrentParisHour()

  // 3. Query users to notify
  const { data: targets, error } = await supabaseAdmin()
    .from('prospection_settings')
    .select('user_id, telegram_chat_id, weekly_message_goal, weekly_call_goal')
    .eq('daily_recap_enabled', true)
    .eq('daily_recap_hour', parisHour)
    .not('telegram_chat_id', 'is', null)

  if (error) {
    console.error('daily-recap query failed', error)
    res.status(500).send('DB error')
    return
  }
  if (!targets || targets.length === 0) {
    res.status(200).json({ parisHour, targets: 0 })
    return
  }

  // 4. Build & send (parallel, isolated failures)
  const results = await Promise.allSettled(
    (targets as Target[]).map((t) => sendRecapTo(t)),
  )
  const sent = results.filter((r) => r.status === 'fulfilled').length

  res.status(200).json({ parisHour, targets: targets.length, sent })
}

async function sendRecapTo(target: Target): Promise<void> {
  const now = new Date()
  const [followups, tasks, weeklyActivity] = await Promise.all([
    fetchFollowupsCounts(target.user_id, now),
    fetchTasksCounts(target.user_id, now),
    fetchWeeklyActivity(target.user_id, now),
  ])

  const message = buildRecapMessage({
    today: formatParisFrenchDate(now),
    weekDay: parisWeekDayNumber(now),
    followups,
    tasks,
    weeklyActivity,
    goals: { messages: target.weekly_message_goal, calls: target.weekly_call_goal },
  })

  await sendMessage(target.telegram_chat_id, message)
}

async function fetchFollowupsCounts(userId: string, now: Date): Promise<{ overdue: number; today: number }> {
  const todayEndIso = parisDateEndToUtcIso(now)
  const todayStartIso = parisDateStartToUtcIso(now)
  const admin = supabaseAdmin()

  const [overdueRes, totalDueRes] = await Promise.all([
    admin
      .from('followups')
      .select('id, contacts!inner(user_id)', { count: 'exact', head: true })
      .eq('contacts.user_id', userId)
      .eq('type', 'prospect_followup')
      .eq('status', 'pending')
      .lt('scheduled_at', todayStartIso),
    admin
      .from('followups')
      .select('id, contacts!inner(user_id)', { count: 'exact', head: true })
      .eq('contacts.user_id', userId)
      .eq('type', 'prospect_followup')
      .eq('status', 'pending')
      .lte('scheduled_at', todayEndIso),
  ])

  const overdue = overdueRes.count ?? 0
  const total = totalDueRes.count ?? 0
  return { overdue, today: Math.max(0, total - overdue) }
}

async function fetchTasksCounts(userId: string, now: Date): Promise<{ overdue: number; today: number }> {
  const today = formatParisYmd(now)
  const admin = supabaseAdmin()

  const [overdueRes, todayRes] = await Promise.all([
    admin
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .eq('assignee', 'owner')
      .eq('completed', false)
      .not('due_date', 'is', null)
      .lt('due_date', today),
    admin
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .eq('assignee', 'owner')
      .eq('completed', false)
      .eq('due_date', today),
  ])

  return { overdue: overdueRes.count ?? 0, today: todayRes.count ?? 0 }
}

async function fetchWeeklyActivity(userId: string, now: Date): Promise<{ messages: number; calls: number }> {
  const weekStartIso = getWeekStartUtcIso(now)
  const admin = supabaseAdmin()

  // Aligned with src/features/crm/api.ts#countCrmWeeklyActivity:
  //   messages = (stage_change → 'message_sent' since weekStart)
  //            + (prospect_followup with status='done' since weekStart)
  //   = "total outbound effort" semantics — first approaches AND follow-ups.
  //   calls    = (stage_change → 'call_booked' since weekStart)
  const [msgsRes, callsRes, fuDoneRes] = await Promise.all([
    admin
      .from('interactions')
      .select('id, contacts!inner(user_id)', { count: 'exact', head: true })
      .eq('contacts.user_id', userId)
      .eq('type', 'stage_change')
      .eq('payload->>new_stage', 'message_sent')
      .gte('created_at', weekStartIso),
    admin
      .from('interactions')
      .select('id, contacts!inner(user_id)', { count: 'exact', head: true })
      .eq('contacts.user_id', userId)
      .eq('type', 'stage_change')
      .eq('payload->>new_stage', 'call_booked')
      .gte('created_at', weekStartIso),
    admin
      .from('followups')
      .select('id, contacts!inner(user_id)', { count: 'exact', head: true })
      .eq('contacts.user_id', userId)
      .eq('type', 'prospect_followup')
      .eq('status', 'done')
      .gte('done_at', weekStartIso),
  ])

  return {
    messages: (msgsRes.count ?? 0) + (fuDoneRes.count ?? 0),
    calls:    callsRes.count ?? 0,
  }
}
