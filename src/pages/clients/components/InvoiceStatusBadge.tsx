import { cn } from '@/lib/utils'
import { computeDisplayStatus, displayStatusLabel, type DisplayStatus } from '@/features/invoices/status'
import type { Invoice } from '@/types/database'

const STYLES: Record<DisplayStatus, string> = {
  pending: 'bg-bg text-muted',
  paid: 'bg-accent-soft text-accent',
  late: 'bg-danger/10 text-danger',
}

export function InvoiceStatusBadge({ invoice }: { invoice: Pick<Invoice, 'status' | 'due_date'> }) {
  const status = computeDisplayStatus(invoice)
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium',
        STYLES[status]
      )}
    >
      {displayStatusLabel(status)}
    </span>
  )
}
