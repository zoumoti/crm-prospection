import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatExpenseAmount } from '@/features/expenses/format'
import { formatPeriodLabel, formatPeriodDeadline, type Period } from './periods'

interface ConfirmDeclarationProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  period: Period
  caBrut: number
  rate: number
  acre: boolean
  amountDue: number
  loading?: boolean
}

export function ConfirmDeclarationDialog({
  open, onClose, onConfirm, period, caBrut, rate, acre, amountDue, loading,
}: ConfirmDeclarationProps) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Confirmer la déclaration"
      confirmLabel="Confirmer"
      loading={loading}
      description={
        <div className="space-y-3">
          <div className="font-medium text-text">{formatPeriodLabel(period)}</div>
          <dl className="text-sm space-y-1">
            <div className="flex justify-between">
              <dt className="text-muted">CA brut encaissé</dt>
              <dd className="text-text">{formatExpenseAmount(caBrut)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Taux</dt>
              <dd className="text-text">{rate.toString().replace('.', ',')}% {acre && '(ACRE)'}</dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt className="text-text">Cotisations dues</dt>
              <dd className="text-accent">{formatExpenseAmount(amountDue)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Date limite</dt>
              <dd className="text-text">{formatPeriodDeadline(period)}</dd>
            </div>
          </dl>
          <div className="rounded-lg bg-accent/10 text-xs px-3 py-2 text-text">
            Ce calcul sera figé (snapshot). Si tu corriges une facture passée
            plus tard, ce montant ne changera pas.
          </div>
        </div>
      }
    />
  )
}

interface DeleteDeclarationProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  period: Period
  amount: number
  loading?: boolean
}

export function DeleteDeclarationDialog({
  open, onClose, onConfirm, period, amount, loading,
}: DeleteDeclarationProps) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Annuler la déclaration ?"
      confirmLabel="Confirmer la suppression"
      confirmVariant="danger"
      loading={loading}
      description={
        <div className="space-y-2">
          <div className="font-medium text-text">{formatPeriodLabel(period)}</div>
          <div className="text-sm text-muted">Montant snapshot : {formatExpenseAmount(amount)}</div>
          <div className="text-sm text-muted">
            La déclaration sera supprimée et la période recalculée à partir des factures actuelles.
          </div>
        </div>
      }
    />
  )
}
