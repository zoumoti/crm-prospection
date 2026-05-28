// src/pages/dashboard/components/CrmGoalsWidget.tsx
//
// Widget 7 — CRM weekly goals.
//
// Header row : ISO-week range + day progress bar (subtle context).
// Two progress bars (messages + calls) against `prospection_settings`.
// Empty state when no goal is configured.

import { Target } from 'lucide-react'
import { WidgetCard } from './WidgetCard'
import type { DashboardData } from '@/features/dashboard/hooks'
import { weekDayNumber, frenchWeekRange } from '@/features/dashboard/dates'

interface CrmGoalsWidgetProps {
  data: DashboardData
  className?: string
}

export function CrmGoalsWidget({ data, className }: CrmGoalsWidgetProps) {
  const { crmGoals, today, weekStart } = data
  const isLoading =
    data.loading.prospectionSettings || data.loading.weeklyCounts || data.loading.dailyMessages
  const error =
    data.error.prospectionSettings || data.error.weeklyCounts || data.error.dailyMessages

  const dayOfWeek = weekDayNumber(today, weekStart)
  const weekProgressPct = Math.round((dayOfWeek / 7) * 100)
  const weekRange = frenchWeekRange(weekStart)

  return (
    <WidgetCard
      title="Objectifs de la semaine"
      icon={<Target className="h-4 w-4" aria-hidden />}
      loading={isLoading}
      skeletonVariant="kpi"
      error={error}
      onRetry={() => {
        void data.refetch.prospectionSettings()
        void data.refetch.weeklyCounts()
        void data.refetch.dailyMessages()
      }}
      isEmpty={crmGoals.unconfigured}
      emptyMessage="Pas d'objectifs hebdo configurés"
      emptyAction={{ label: 'Configurer mes objectifs CRM', href: '/settings' }}
      className={className}
    >
      <div className="flex flex-col h-full justify-center gap-5">
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-xs text-muted uppercase tracking-wide">
              Sem. du {weekRange}
            </span>
            <span className="text-xs text-muted tabular-nums">
              Jour {dayOfWeek} / 7
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted-soft overflow-hidden">
            <div
              className="h-full rounded-full bg-muted transition-all"
              style={{ width: `${weekProgressPct}%` }}
            />
          </div>
        </div>

        <div className="space-y-4">
          {crmGoals.messageGoal != null ? (
            <div>
              <GoalBar
                label="Messages envoyés"
                current={crmGoals.messagesThisWeek}
                goal={crmGoals.messageGoal}
              />
              <p className="mt-1.5 text-xs text-muted tabular-nums">
                {crmGoals.messagesToday} envoyé{crmGoals.messagesToday > 1 ? 's' : ''} aujourd'hui
              </p>
            </div>
          ) : null}
          {crmGoals.callGoal != null ? (
            <GoalBar
              label="Appels bookés"
              current={crmGoals.callsThisWeek}
              goal={crmGoals.callGoal}
            />
          ) : null}
        </div>

        {crmGoals.allGoalsReached ? (
          <p className="text-sm text-success font-medium">
            Objectifs atteints cette semaine 🎉
          </p>
        ) : null}
      </div>
    </WidgetCard>
  )
}

interface GoalBarProps {
  label: string
  current: number
  goal: number
}

function GoalBar({ label, current, goal }: GoalBarProps) {
  const pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0
  const reached = current >= goal
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm text-text">{label}</span>
        <span
          className={[
            'text-sm font-semibold tabular-nums',
            reached ? 'text-success' : 'text-text',
          ].join(' ')}
        >
          {current} / {goal}
          {reached ? ' ✓' : ''}
        </span>
      </div>
      <div className="h-3 rounded-full bg-muted-soft overflow-hidden">
        <div
          className={[
            'h-full rounded-full transition-all',
            reached ? 'bg-success' : 'bg-accent',
          ].join(' ')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
