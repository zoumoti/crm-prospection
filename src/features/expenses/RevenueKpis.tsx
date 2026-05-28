import { Card } from '@/components/ui/Card'
import { formatExpenseAmount } from './format'

interface RevenueKpisProps {
  revenues: number
  expenses: number
}

export function RevenueKpis({ revenues, expenses }: RevenueKpisProps) {
  const net = revenues - expenses
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
      <Card>
        <div className="text-xs text-muted">Revenus du mois</div>
        <div className="text-2xl font-semibold text-accent mt-1">
          {formatExpenseAmount(revenues)}
        </div>
      </Card>
      <Card>
        <div className="text-xs text-muted">Dépenses du mois</div>
        <div className="text-2xl font-semibold text-text mt-1">
          {formatExpenseAmount(expenses)}
        </div>
      </Card>
      <Card>
        <div className="text-xs text-muted">Bénéfice net</div>
        <div className={`text-2xl font-semibold mt-1 ${net < 0 ? 'text-danger' : 'text-accent'}`}>
          {formatExpenseAmount(net)}
        </div>
      </Card>
    </div>
  )
}
