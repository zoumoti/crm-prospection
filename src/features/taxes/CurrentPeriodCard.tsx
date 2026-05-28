import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatExpenseAmount } from '@/features/expenses/format'
import { formatPeriodLabel, formatPeriodDeadline, periodDeadline, type Period } from './periods'

interface CurrentPeriodCardProps {
  period: Period
  caBrut: number
  rate: number
  acre: boolean
  amountDue: number
  onMarkPaid: () => void
  isPending?: boolean
}

export function CurrentPeriodCard({
  period,
  caBrut,
  rate,
  acre,
  amountDue,
  onMarkPaid,
  isPending,
}: CurrentPeriodCardProps) {
  const deadline = periodDeadline(period)
  const overdue = deadline.getTime() < Date.now()
  return (
    <Card>
      <div className="text-xs text-muted">Période courante</div>
      <h2 className="text-xl font-semibold text-text mt-1">{formatPeriodLabel(period)}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <div>
          <div className="text-xs text-muted">CA brut encaissé</div>
          <div className="text-2xl font-semibold text-text mt-1">{formatExpenseAmount(caBrut)}</div>
        </div>
        <div>
          <div className="text-xs text-muted">Taux appliqué</div>
          <div className="text-2xl font-semibold text-text mt-1">
            {rate.toString().replace('.', ',')}% {acre && <span className="text-sm text-accent">(ACRE)</span>}
          </div>
        </div>
        <div className="sm:col-span-2">
          <div className="text-xs text-muted">Cotisations dues</div>
          <div className="text-3xl font-semibold text-accent mt-1">{formatExpenseAmount(amountDue)}</div>
        </div>
      </div>
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className={`text-sm ${overdue ? 'text-danger font-medium' : 'text-muted'}`}>
          À déclarer avant le {formatPeriodDeadline(period)}
        </div>
        <Button onClick={onMarkPaid} disabled={isPending || amountDue <= 0}>
          Marquer déclaré et payé
        </Button>
      </div>
    </Card>
  )
}
