import { useState, useRef } from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Label } from '@/components/ui/Label'
import { Input } from '@/components/ui/Input'

export type ExportRange =
  | { kind: 'month' }
  | { kind: 'quarter' }
  | { kind: 'year' }
  | { kind: 'custom'; startMonth: string; endMonth: string }

interface ExportPdfModalProps {
  open: boolean
  onClose: () => void
  onExport: (range: ExportRange) => void | Promise<void>
  loading?: boolean
  defaultMonth: string  // 'YYYY-MM'
}

export function ExportPdfModal({ open, onClose, onExport, loading, defaultMonth }: ExportPdfModalProps) {
  const [kind, setKind] = useState<'month' | 'quarter' | 'year' | 'custom'>('month')
  const [startMonth, setStartMonth] = useState(defaultMonth)
  const [endMonth, setEndMonth] = useState(defaultMonth)
  const [error, setError] = useState<string | null>(null)
  const submittingRef = useRef(false)

  async function handleConfirm() {
    if (submittingRef.current) return
    setError(null)
    let range: ExportRange
    if (kind === 'custom') {
      if (!/^\d{4}-\d{2}$/.test(startMonth) || !/^\d{4}-\d{2}$/.test(endMonth)) {
        setError('Mois invalide.')
        return
      }
      if (startMonth > endMonth) {
        setError('Le mois de début doit précéder le mois de fin.')
        return
      }
      range = { kind: 'custom', startMonth, endMonth }
    } else {
      range = { kind }
    }
    submittingRef.current = true
    try {
      await onExport(range)
    } finally {
      submittingRef.current = false
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Exporter le bilan financier"
      confirmLabel="Générer PDF"
      loading={loading}
      description={
        <div className="space-y-3">
          {(['month', 'quarter', 'year', 'custom'] as const).map((k) => (
            <label key={k} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value={k}
                checked={kind === k}
                onChange={() => setKind(k)}
                className="h-4 w-4 accent-accent"
              />
              <span className="text-sm text-text">
                {k === 'month' && 'Mois en cours'}
                {k === 'quarter' && 'Trimestre en cours'}
                {k === 'year' && 'Année en cours'}
                {k === 'custom' && 'Période custom'}
              </span>
            </label>
          ))}
          {kind === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label className="mb-1 block text-xs">Mois début</Label>
                <Input
                  type="month"
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs">Mois fin</Label>
                <Input
                  type="month"
                  value={endMonth}
                  onChange={(e) => setEndMonth(e.target.value)}
                />
              </div>
            </div>
          )}
          {error && <div className="text-xs text-danger">{error}</div>}
        </div>
      }
    />
  )
}
