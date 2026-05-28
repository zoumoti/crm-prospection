// src/pages/dashboard/components/TodayTasksWidget.tsx
//
// Widget 4 — Today's tasks, sectioned by bucket (EN RETARD / AUJOURD'HUI /
// À PRIORISER). Inline checkbox uses useToggleTask (optimistic). Capped to 5
// items total with a "Voir toutes (N)" footer when totalCount > 5.

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CheckSquare, Square, CheckCircle2 } from 'lucide-react'
import { useToggleTask } from '@/features/tasks/hooks'
import { relativeDaysLabel } from '@/features/dashboard/dates'
import type { TodayTaskBucket, TodayTasksWidgetItem } from '@/features/dashboard/api'
import type { Client, Task } from '@/types/database'
import { WidgetCard } from './WidgetCard'
import type { DashboardData } from '@/features/dashboard/hooks'

interface TodayTasksWidgetProps {
  data: DashboardData
  className?: string
}

export function TodayTasksWidget({ data, className }: TodayTasksWidgetProps) {
  const { todayTasks, clientsRaw, today } = data
  const isEmpty = todayTasks.items.length === 0
  const showFooter = todayTasks.totalCount > todayTasks.items.length

  const clientMap = useMemo(() => {
    const m = new Map<string, Client>()
    for (const c of clientsRaw) m.set(c.id, c)
    return m
  }, [clientsRaw])

  // Group by bucket while preserving order.
  const groups = useMemo(() => groupByBucket(todayTasks.items), [todayTasks.items])

  return (
    <WidgetCard
      title="Tâches du jour"
      icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
      loading={data.loading.tasks}
      skeletonVariant="list"
      error={data.error.tasks}
      onRetry={() => void data.refetch.tasks()}
      isEmpty={isEmpty}
      emptyMessage="Rien pour aujourd'hui 🎯"
      emptyAction={{ label: 'Voir toutes', href: '/tasks' }}
      footerLabel={showFooter ? `Voir toutes (${todayTasks.totalCount})` : undefined}
      footerHref={showFooter ? '/tasks' : undefined}
      className={className}
    >
      <div className="divide-y divide-border/40">
        {groups.map(group => (
          <BucketSection
            key={group.bucket}
            bucket={group.bucket}
            items={group.items}
            clientMap={clientMap}
            today={today}
          />
        ))}
      </div>
    </WidgetCard>
  )
}

interface BucketGroup {
  bucket: TodayTaskBucket
  items: TodayTasksWidgetItem[]
}

function groupByBucket(items: TodayTasksWidgetItem[]): BucketGroup[] {
  const map = new Map<TodayTaskBucket, TodayTasksWidgetItem[]>()
  for (const it of items) {
    const arr = map.get(it.bucket) ?? []
    arr.push(it)
    map.set(it.bucket, arr)
  }
  const order: TodayTaskBucket[] = ['overdue', 'today', 'high_no_date']
  return order
    .filter(b => map.has(b))
    .map(b => ({ bucket: b, items: map.get(b)! }))
}

const BUCKET_LABEL: Record<TodayTaskBucket, string> = {
  overdue: 'EN RETARD',
  today: "AUJOURD'HUI",
  high_no_date: 'À PRIORISER',
}

const BUCKET_LABEL_COLOR: Record<TodayTaskBucket, string> = {
  overdue: 'text-danger',
  today: 'text-text',
  high_no_date: 'text-warning',
}

interface BucketSectionProps {
  bucket: TodayTaskBucket
  items: TodayTasksWidgetItem[]
  clientMap: Map<string, Client>
  today: string
}

function BucketSection({ bucket, items, clientMap, today }: BucketSectionProps) {
  return (
    <div className="py-2 first:pt-0 last:pb-0">
      <div
        className={[
          'text-xs uppercase tracking-wide mb-1',
          BUCKET_LABEL_COLOR[bucket],
        ].join(' ')}
      >
        {BUCKET_LABEL[bucket]}
      </div>
      <ul>
        {items.map(item => (
          <TaskRowDashboard
            key={item.task.id}
            task={item.task}
            bucket={item.bucket}
            client={item.task.client_id ? clientMap.get(item.task.client_id) ?? null : null}
            today={today}
          />
        ))}
      </ul>
    </div>
  )
}

interface TaskRowProps {
  task: Task
  bucket: TodayTaskBucket
  client: Client | null
  today: string
}

function TaskRowDashboard({ task, bucket, client, today }: TaskRowProps) {
  const toggle = useToggleTask()

  function handleToggle() {
    if (toggle.isPending) return
    toggle.mutate({ id: task.id, completed: true })
  }

  const relative =
    bucket === 'overdue' && task.due_date
      ? relativeDaysLabel(task.due_date, today)
      : null

  return (
    <li>
      <div className="flex items-center gap-3 py-1.5 min-h-11">
        <button
          type="button"
          onClick={handleToggle}
          aria-label={`Marquer "${task.title}" comme fait`}
          disabled={toggle.isPending}
          className="h-11 w-11 -my-2 -ml-2 flex items-center justify-center disabled:opacity-50 transition shrink-0 group"
        >
          <span className="h-7 w-7 rounded-md flex items-center justify-center group-hover:bg-muted-soft transition">
            {toggle.isPending ? (
              <CheckSquare className="h-5 w-5 text-accent animate-pulse" aria-hidden />
            ) : (
              <Square className="h-5 w-5 text-muted" aria-hidden />
            )}
          </span>
        </button>

        <div className="flex-1 min-w-0">
          <Link
            to={`/tasks/${task.id}/edit`}
            className="text-sm text-text hover:underline truncate block"
          >
            {task.title}
          </Link>
        </div>

        {client ? (
          <span className="text-xs bg-muted-soft text-muted rounded-md px-2 py-0.5 shrink-0 truncate max-w-[8rem]">
            {client.first_name} {client.last_name}
          </span>
        ) : null}

        {relative ? (
          <span className="text-xs text-danger shrink-0">{relative}</span>
        ) : null}
      </div>
    </li>
  )
}
