import { type ReactNode, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './Button'
import { Spinner } from './Spinner'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: 'primary' | 'danger'
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  confirmVariant = 'primary',
  loading = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, loading])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={loading ? undefined : onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative bg-surface rounded-2xl shadow-card border border-border/40 max-w-md w-full p-6">
        <h2 className="text-lg font-semibold text-text mb-2">{title}</h2>
        {description && <div className="text-sm text-muted mb-6">{description}</div>}
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant="primary"
            onClick={() => void onConfirm()}
            disabled={loading}
            className={cn(
              confirmVariant === 'danger' && 'bg-danger hover:bg-danger/90'
            )}
          >
            {loading ? <Spinner size="sm" /> : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
