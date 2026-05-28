import { useEffect, useRef, useState } from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Label } from '@/components/ui/Label'
import { Input } from '@/components/ui/Input'
import type { Invoice } from '@/types/database'

interface MarkPaidModalProps {
  open: boolean
  onClose: () => void
  invoice: Pick<Invoice, 'id' | 'invoice_number' | 'invoice_date' | 'paid_at'>
  mode: 'mark' | 'edit'
  loading?: boolean
  onConfirm: (paidAtIso: string) => void | Promise<void>
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function paidAtToDateInput(paidAt: string | null): string {
  if (!paidAt) return todayIso()
  return paidAt.slice(0, 10)
}

export function MarkPaidModal({
  open,
  onClose,
  invoice,
  mode,
  loading,
  onConfirm,
}: MarkPaidModalProps) {
  const [date, setDate] = useState(paidAtToDateInput(invoice.paid_at))
  const [error, setError] = useState<string | null>(null)
  const submittingRef = useRef(false)

  useEffect(() => {
    if (open) {
      setDate(mode === 'edit' ? paidAtToDateInput(invoice.paid_at) : todayIso())
      setError(null)
      submittingRef.current = false
    }
  }, [open, invoice.paid_at, mode])

  const title =
    mode === 'mark'
      ? `Marquer la facture ${invoice.invoice_number} comme payée`
      : `Modifier la date d'encaissement de ${invoice.invoice_number}`

  async function handleConfirm() {
    if (submittingRef.current) return
    setError(null)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Date invalide')
      return
    }
    if (date < invoice.invoice_date) {
      setError("La date d'encaissement ne peut pas être antérieure à la facturation.")
      return
    }
    if (date > todayIso()) {
      setError("La date d'encaissement ne peut pas être dans le futur.")
      return
    }
    submittingRef.current = true
    try {
      await onConfirm(`${date}T12:00:00Z`)
    } finally {
      submittingRef.current = false
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={handleConfirm}
      title={title}
      loading={loading}
      confirmLabel="Confirmer"
      description={
        <div className="space-y-3">
          <div>
            <Label className="mb-1.5 block">Date d'encaissement</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={invoice.invoice_date}
              max={todayIso()}
              disabled={loading}
            />
          </div>
          {error && (
            <div className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>
      }
    />
  )
}
