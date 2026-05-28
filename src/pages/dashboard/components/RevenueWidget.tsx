// src/pages/dashboard/components/RevenueWidget.tsx
//
// Widget 1 — Revenues this month.
//
// Body: large KPI (HT amount this month) + month label + delta chip vs previous
// month + 6-month sparkline (recharts BarChart, last bar = current month in accent).
// Empty when no paid invoices exist at all (current=0 AND previous=0 AND no history).

import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { formatCurrency } from '@/features/invoices/totals'
import { getCurrentYearMonth, previousMonth } from '@/features/dashboard/dates'
import type { DashboardData } from '@/features/dashboard/hooks'
import { WidgetCard } from './WidgetCard'

const MONTH_LABELS_FR_LONG = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

interface RevenueWidgetProps {
  data: DashboardData
  className?: string
}

export function RevenueWidget({ data, className }: RevenueWidgetProps) {
  const { revenue } = data

  const { year, month } = getCurrentYearMonth()
  const prev = previousMonth(year, month)
  const monthLabel = `${capitalize(MONTH_LABELS_FR_LONG[month - 1])} ${year}`
  const prevMonthLabel = MONTH_LABELS_FR_LONG[prev.month - 1]

  const sparklineData = useMemo(
    () => revenue.sparkline.map((p, idx) => ({
      ...p,
      isCurrent: idx === revenue.sparkline.length - 1,
    })),
    [revenue.sparkline]
  )

  const isEmpty = !revenue.hasAnyHistory && revenue.currentMonthHt === 0

  return (
    <WidgetCard
      title="Revenus du mois"
      loading={data.loading.invoices}
      skeletonVariant="kpi-sparkline"
      error={data.error.invoices}
      onRetry={() => void data.refetch.invoices()}
      isEmpty={isEmpty}
      emptyMessage="Aucune facture payée pour le moment"
      emptyAction={{ label: 'Créer une facture', href: '/invoices/new' }}
      footerLabel="Voir le détail"
      footerHref="/finance/revenue"
      className={className}
    >
      <div className="space-y-3">
        <div>
          <div className="text-2xl font-semibold text-text">
            {formatCurrency(revenue.currentMonthHt)}
          </div>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted">{monthLabel}</span>
            <DeltaChip
              deltaPct={revenue.deltaPct}
              isFirstRevenue={revenue.isFirstRevenue}
              prevMonthLabel={prevMonthLabel}
            />
          </div>
        </div>

        <div className="h-16 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sparklineData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <Tooltip
                cursor={false}
                contentStyle={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.5rem',
                }}
                formatter={(value) => formatCurrency(Number(value))}
                labelFormatter={(label) => String(label ?? '')}
              />
              <Bar dataKey="ht" radius={[3, 3, 0, 0]}>
                {sparklineData.map(point => (
                  <Cell
                    key={point.key}
                    fill={point.isCurrent ? 'var(--color-accent)' : 'var(--color-muted)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </WidgetCard>
  )
}

interface DeltaChipProps {
  deltaPct: number | null
  isFirstRevenue: boolean
  prevMonthLabel: string
}

function DeltaChip({ deltaPct, isFirstRevenue, prevMonthLabel }: DeltaChipProps) {
  if (isFirstRevenue) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-success-soft text-success">
        <TrendingUp className="h-3 w-3" aria-hidden />
        Premier revenu
      </span>
    )
  }
  if (deltaPct == null) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-muted-soft text-muted">
        <Minus className="h-3 w-3" aria-hidden />
        —
      </span>
    )
  }
  const positive = deltaPct >= 0
  const Icon = positive ? TrendingUp : TrendingDown
  const formatted = `${positive ? '+' : ''}${deltaPct.toFixed(1)} %`
  return (
    <span
      className={[
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs',
        positive ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger',
      ].join(' ')}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {formatted} vs {prevMonthLabel}
    </span>
  )
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
