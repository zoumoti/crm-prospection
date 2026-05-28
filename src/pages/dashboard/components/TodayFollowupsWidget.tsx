// src/pages/dashboard/components/TodayFollowupsWidget.tsx
//
// Widget 5 — Today's followups (overdue + today only). Inline "Fait" button
// uses useCompleteFollowup (no optimistic — accepts ~200ms latency).

import { Link } from 'react-router-dom'
import { Check, Loader2, Phone } from 'lucide-react'
import { useCompleteFollowup } from '@/features/crm/hooks'
import { WidgetCard } from './WidgetCard'
import type { TodayFollowupsWidgetItem } from '@/features/dashboard/api'
import type { DashboardData } from '@/features/dashboard/hooks'

interface TodayFollowupsWidgetProps {
  data: DashboardData
  className?: string
}

export function TodayFollowupsWidget({ data, className }: TodayFollowupsWidgetProps) {
  const { todayFollowups } = data
  const totalUnseen = todayFollowups.overdueCount + todayFollowups.todayCount
  const isEmpty = totalUnseen === 0
  const showFooter = totalUnseen > todayFollowups.items.length

  const footerBucket = todayFollowups.overdueCount > todayFollowups.todayCount ? 'overdue' : 'today'

  // Group items by bucket for sectioning.
  const overdueItems = todayFollowups.items.filter(it => it.bucket === 'overdue')
  const todayItems = todayFollowups.items.filter(it => it.bucket === 'today')

  return (
    <WidgetCard
      title="Relances du jour"
      icon={<Phone className="h-4 w-4" aria-hidden />}
      loading={data.loading.followups}
      skeletonVariant="list"
      error={data.error.followups}
      onRetry={() => void data.refetch.followups()}
      isEmpty={isEmpty}
      emptyMessage="Aucune relance aujourd'hui ✓"
      emptyAction={{ label: 'Voir toutes', href: '/crm/followups' }}
      footerLabel={showFooter ? `Voir toutes (${totalUnseen})` : undefined}
      footerHref={showFooter ? `/crm/followups?bucket=${footerBucket}` : undefined}
      className={className}
    >
      <div className="divide-y divide-border/40">
        {overdueItems.length > 0 ? (
          <FollowupSection
            label="EN RETARD"
            labelColor="text-danger"
            items={overdueItems}
          />
        ) : null}
        {todayItems.length > 0 ? (
          <FollowupSection
            label="AUJOURD'HUI"
            labelColor="text-warning"
            items={todayItems}
          />
        ) : null}
      </div>
    </WidgetCard>
  )
}

interface FollowupSectionProps {
  label: string
  labelColor: string
  items: TodayFollowupsWidgetItem[]
}

function FollowupSection({ label, labelColor, items }: FollowupSectionProps) {
  return (
    <div className="py-2 first:pt-0 last:pb-0">
      <div className={['text-xs uppercase tracking-wide mb-1', labelColor].join(' ')}>
        {label}
      </div>
      <ul>
        {items.map(item => (
          <FollowupRow key={item.followup.id} item={item} />
        ))}
      </ul>
    </div>
  )
}

interface FollowupRowProps {
  item: TodayFollowupsWidgetItem
}

function FollowupRow({ item }: FollowupRowProps) {
  const complete = useCompleteFollowup()
  const { followup } = item
  const { contact } = followup
  const fullName = `${contact.first_name} ${contact.last_name}`
  const subtitle = contact.company ? contact.company : '—'
  const initials = (contact.first_name[0] ?? '?') + (contact.last_name[0] ?? '')

  function handleDone() {
    if (complete.isPending) return
    complete.mutate({ followupId: followup.id, note: null })
  }

  return (
    <li>
      <div className="flex items-center gap-3 py-1.5 min-h-11">
        <div className="h-8 w-8 rounded-full bg-muted-soft text-xs flex items-center justify-center shrink-0 font-medium text-text uppercase">
          {initials}
        </div>

        <Link
          to={`/crm/contacts/${contact.id}`}
          className="flex-1 min-w-0 hover:underline"
        >
          <div className="text-sm font-medium text-text truncate">{fullName}</div>
          <div className="text-xs text-muted truncate">{subtitle}</div>
        </Link>

        <button
          type="button"
          onClick={handleDone}
          aria-label={`Marquer la relance pour ${fullName} comme faite`}
          disabled={complete.isPending}
          className="h-11 w-11 -my-2 -mr-2 flex items-center justify-center disabled:opacity-50 transition shrink-0 text-accent group"
        >
          <span className="h-7 w-7 rounded-md flex items-center justify-center group-hover:bg-accent-soft transition">
            {complete.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <Check className="h-5 w-5" aria-hidden />
            )}
          </span>
        </button>
      </div>
    </li>
  )
}
