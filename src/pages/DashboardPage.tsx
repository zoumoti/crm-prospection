// src/pages/DashboardPage.tsx
//
// Module 1 — Dashboard v2 (CRM-centric).
// 5 widgets : Tâches + Relances + Objectifs CRM + Revenus + Funnel (pleine
// largeur). Mobile : stack vertical Tâches → Relances → Objectifs → Revenus
// → Funnel. Desktop : grille 2 cols + funnel en bandeau plein dessous.

import { useDashboardData } from '@/features/dashboard/hooks'
import { frenchLongDate } from '@/features/dashboard/dates'
import { RevenueWidget } from './dashboard/components/RevenueWidget'
import { TodayTasksWidget } from './dashboard/components/TodayTasksWidget'
import { TodayFollowupsWidget } from './dashboard/components/TodayFollowupsWidget'
import { CrmGoalsWidget } from './dashboard/components/CrmGoalsWidget'
import { CrmFunnelWidget } from './dashboard/components/CrmFunnelWidget'

export function DashboardPage() {
  const data = useDashboardData()
  const greeting = data.settings?.commercial_name
    ? `Bonjour ${data.settings.commercial_name}`
    : 'Bonjour'

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold text-text break-words">
          {greeting}
        </h1>
        <p className="text-sm text-muted mt-1">{frenchLongDate(data.today)}</p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <TodayTasksWidget     data={data} />
        <TodayFollowupsWidget data={data} />
        <CrmGoalsWidget       data={data} />
        <RevenueWidget        data={data} />
        <CrmFunnelWidget      data={data} className="md:col-span-2" />
      </div>
    </div>
  )
}
