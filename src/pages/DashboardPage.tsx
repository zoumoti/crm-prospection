import { useDashboardData } from '@/features/dashboard/hooks'
import { frenchLongDate } from '@/features/dashboard/dates'
import { TodayFollowupsWidget } from './dashboard/components/TodayFollowupsWidget'
import { CrmGoalsWidget } from './dashboard/components/CrmGoalsWidget'
import { CrmFunnelWidget } from './dashboard/components/CrmFunnelWidget'

export function DashboardPage() {
  const data = useDashboardData()

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold text-text break-words">
          Bonjour
        </h1>
        <p className="text-sm text-muted mt-1">{frenchLongDate(data.today)}</p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <TodayFollowupsWidget data={data} />
        <CrmGoalsWidget       data={data} />
        <CrmFunnelWidget      data={data} className="md:col-span-2" />
      </div>
    </div>
  )
}
