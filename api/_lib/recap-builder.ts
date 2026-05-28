// api/_lib/recap-builder.ts
// Composes the HTML body of the daily Telegram recap message.
// Sections are conditionally included — only goals section is always
// shown if any goal is configured. Zero-activity path emits a tiny
// "Rien à faire ✨" message (we always send something, to confirm
// the cron pipeline is alive).

import { env } from './env.js'

export type RecapData = {
  /** Date label in French, ex. "jeudi 14 mai" */
  today: string
  /** ISO weekday number 1-7 */
  weekDay: number
  followups: { overdue: number; today: number }
  tasks:     { overdue: number; today: number }
  weeklyActivity: { messages: number; calls: number }
  goals:     { messages: number | null; calls: number | null }
}

export function buildRecapMessage(d: RecapData): string {
  const totalActivity = d.followups.overdue + d.followups.today
                      + d.tasks.overdue + d.tasks.today
  const goalsHit = (d.goals.messages == null || d.weeklyActivity.messages >= d.goals.messages)
                && (d.goals.calls == null || d.weeklyActivity.calls >= d.goals.calls)

  const header = `<b><u>☀️ Récap du ${d.today}</u></b>`

  if (totalActivity === 0 && goalsHit) {
    return `${header}\n\nRien à faire ✨`
  }

  const sections: string[] = [header]

  // Section relances
  if (d.followups.overdue + d.followups.today > 0) {
    const lines: string[] = ['<b>🔥 Relances prospect</b>', '']
    if (d.followups.overdue > 0) lines.push(`• ${d.followups.overdue} en retard`)
    if (d.followups.today > 0)   lines.push(`• ${d.followups.today} aujourd'hui`)
    const bucket = d.followups.overdue > 0 ? 'overdue' : 'today'
    lines.push(`→ ${env.PUBLIC_APP_URL}/crm/followups?bucket=${bucket}`)
    sections.push(lines.join('\n'))
  }

  // Section tâches
  if (d.tasks.overdue + d.tasks.today > 0) {
    const lines: string[] = ['<b>✅ Tâches</b>', '']
    if (d.tasks.overdue > 0) lines.push(`• ${d.tasks.overdue} en retard`)
    if (d.tasks.today > 0)   lines.push(`• ${d.tasks.today} aujourd'hui`)
    lines.push(`→ ${env.PUBLIC_APP_URL}/tasks?filter=today`)
    sections.push(lines.join('\n'))
  }

  // Section objectifs (toujours affichée si ≥ 1 goal défini)
  if (d.goals.messages != null || d.goals.calls != null) {
    const lines: string[] = [`<b>🎯 Objectifs semaine (J${d.weekDay}/7)</b>`, '']
    if (d.goals.messages != null) {
      lines.push(`Messages  ${asciiBar(d.weeklyActivity.messages, d.goals.messages)} ${d.weeklyActivity.messages}/${d.goals.messages}`)
    }
    if (d.goals.calls != null) {
      lines.push(`Appels    ${asciiBar(d.weeklyActivity.calls, d.goals.calls)} ${d.weeklyActivity.calls}/${d.goals.calls}`)
    }
    sections.push(lines.join('\n'))
  }

  return sections.join('\n\n')
}

function asciiBar(count: number, goal: number): string {
  if (goal === 0) return '──────────'  // goal nul, on évite division par zéro
  const filled = Math.min(10, Math.max(0, Math.floor((count / goal) * 10)))
  return '█'.repeat(filled) + '░'.repeat(10 - filled)
}
