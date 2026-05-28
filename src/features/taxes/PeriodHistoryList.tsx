import { useEffect, useRef, useState } from 'react'
import { MoreVertical } from 'lucide-react'
import { formatExpenseAmount } from '@/features/expenses/format'
import {
  formatPeriodLabel,
  formatPeriodDeadline,
  periodDeadline,
  type Period,
  periodKey,
} from './periods'

export interface HistoryItem {
  period: Period
  status: 'paid' | 'due' | 'overdue'
  amount: number
  declarationId?: string
}

interface PeriodHistoryListProps {
  items: HistoryItem[]
  initialLimit?: number
  onMarkPaid: (period: Period) => void
  onCancel: (declarationId: string, period: Period, amount: number) => void
}

export function PeriodHistoryList({
  items,
  initialLimit = 8,
  onMarkPaid,
  onCancel,
}: PeriodHistoryListProps) {
  const [limit, setLimit] = useState(initialLimit)
  const shown = items.slice(0, limit)

  return (
    <div className="space-y-2">
      {shown.map((it) => (
        <HistoryCard
          key={periodKey(it.period)}
          item={it}
          onMarkPaid={onMarkPaid}
          onCancel={onCancel}
        />
      ))}
      {limit < items.length && (
        <button
          type="button"
          onClick={() => setLimit(limit + 8)}
          className="w-full py-2 rounded-xl border border-border bg-surface text-sm text-text hover:bg-bg"
        >
          Voir plus ({items.length - limit} restantes)
        </button>
      )}
      {items.length === 0 && (
        <div className="text-center text-muted py-8 text-sm">Aucun historique.</div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: HistoryItem['status'] }) {
  if (status === 'paid') {
    return <span className="px-2 py-0.5 rounded-full text-xs bg-accent/15 text-accent">Payé ✓</span>
  }
  if (status === 'overdue') {
    return <span className="px-2 py-0.5 rounded-full text-xs bg-danger/10 text-danger">En retard</span>
  }
  return <span className="px-2 py-0.5 rounded-full text-xs bg-warning/15 text-warning">À déclarer</span>
}

function HistoryCard({
  item, onMarkPaid, onCancel,
}: {
  item: HistoryItem
  onMarkPaid: (period: Period) => void
  onCancel: (id: string, period: Period, amount: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [openUp, setOpenUp] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const overdue = periodDeadline(item.period).getTime() < Date.now() && item.status !== 'paid'

  // Estimated menu height: 1 item × 36px + padding = ~80px, take 120px to be safe.
  const ESTIMATED_MENU_HEIGHT = 120

  function toggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      setOpenUp(spaceBelow < ESTIMATED_MENU_HEIGHT)
    }
    setOpen((o) => !o)
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
        <div className="font-medium text-text">{formatPeriodLabel(item.period)}</div>
        <StatusBadge status={item.status} />
        {item.status !== 'paid' && (
          <div className="text-xs text-muted">Limite : {formatPeriodDeadline(item.period)}</div>
        )}
      </div>
      <div className="flex items-center gap-2 justify-end">
        <div className={`text-lg font-semibold ${overdue ? 'text-danger' : item.status === 'paid' ? 'text-accent' : 'text-text'}`}>
          {formatExpenseAmount(item.amount)}
        </div>
        <div ref={ref} className="relative">
          <button
            ref={buttonRef}
            type="button"
            onClick={toggle}
            aria-label="Actions"
            className="h-11 w-11 rounded-xl flex items-center justify-center text-muted hover:bg-bg"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {open && (
            <div className={`absolute right-0 z-20 w-56 rounded-xl bg-surface border border-border shadow-card py-1 ${openUp ? 'bottom-12' : 'top-12'}`}>
              {item.status === 'paid' && item.declarationId ? (
                <button
                  type="button"
                  onClick={() => { setOpen(false); onCancel(item.declarationId!, item.period, item.amount) }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-bg text-danger"
                >
                  Annuler la déclaration
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setOpen(false); onMarkPaid(item.period) }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-bg"
                  disabled={item.amount <= 0}
                >
                  Marquer déclaré et payé
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
