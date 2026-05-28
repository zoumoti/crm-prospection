// src/features/dashboard/hooks.ts
//
// Composite hook orchestrating the dashboard widget queries. Uses queryKeys
// identical to the source-feature hooks (`['clients']`, `['invoices','list',{}]`,
// `['tasks']`, `['followups','pending']`, `['settings']`, `['contacts',{}]`,
// `['prospection-settings']`) so the cache is shared — navigating Dashboard ↔
// source pages is instant.
//
// staleTime / refetchOnWindowFocus are local to the dashboard consumer.

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import * as clientsApi from '@/features/clients/api'
import * as invoicesApi from '@/features/invoices/api'
import * as tasksApi from '@/features/tasks/api'
import * as crmApi from '@/features/crm/api'
import * as settingsApi from '@/features/settings/api'

import {
  computeRevenueWidget,
  computeTodayTasksWidget,
  computeTodayFollowupsWidget,
  computeCrmGoalsWidget,
  computeCrmFunnelWidget,
} from './api'
import { getTodayISO, getWeekStartISO } from './dates'
import { useCrmWeeklyCounts, useCrmDailyMessageCount } from '@/features/crm/hooks'

export function useDashboardData() {
  // Stable date strings for the lifetime of this render — never `new Date()` in deps.
  // Memoize with empty deps so re-renders within the same day keep the same identity.
  const today = useMemo(() => getTodayISO(), [])
  const weekStart = useMemo(() => getWeekStartISO(), [])

  const clientsQ = useQuery({
    queryKey: ['clients'],
    queryFn: clientsApi.listClients,
    staleTime: 60_000,
  })
  const invoicesQ = useQuery({
    queryKey: ['invoices', 'list', {}],
    queryFn: () => invoicesApi.listInvoices(),
    staleTime: 60_000,
  })
  const tasksQ = useQuery({
    queryKey: ['tasks'],
    queryFn: tasksApi.listTasks,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
  const followupsQ = useQuery({
    queryKey: ['followups', 'pending'],
    queryFn: crmApi.listPendingFollowupsWithContact,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
  const settingsQ = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getCompanySettings,
    staleTime: 60_000,
  })
  const contactsQ = useQuery({
    queryKey: ['contacts', {}],
    queryFn: () => crmApi.listContacts({}),
    staleTime: 60_000,
  })
  const prospectionSettingsQ = useQuery({
    queryKey: ['prospection-settings'],
    queryFn: crmApi.getProspectionSettings,
    staleTime: 60_000,
  })
  const weeklyCountsQ = useCrmWeeklyCounts()
  const dailyMessagesQ = useCrmDailyMessageCount()

  const invoices = invoicesQ.data ?? []
  const clients = clientsQ.data ?? []
  const tasks = tasksQ.data ?? []
  const followups = followupsQ.data ?? []
  const settings = settingsQ.data ?? null

  const revenue = useMemo(
    () => computeRevenueWidget(invoices, today),
    [invoices, today]
  )
  const todayTasks = useMemo(
    () => computeTodayTasksWidget(tasks, today),
    [tasks, today]
  )
  const todayFollowups = useMemo(
    () => computeTodayFollowupsWidget(followups, today),
    [followups, today]
  )

  const contacts = contactsQ.data ?? []
  const prospectionSettings = prospectionSettingsQ.data ?? null
  const weeklyCounts = weeklyCountsQ.data ?? null
  const messagesToday = dailyMessagesQ.data ?? 0

  const crmGoals = useMemo(
    () => computeCrmGoalsWidget({ settings: prospectionSettings, weeklyCounts, messagesToday }),
    [prospectionSettings, weeklyCounts, messagesToday]
  )
  const crmFunnel = useMemo(
    () => computeCrmFunnelWidget(contacts),
    [contacts]
  )

  return {
    today,
    weekStart,
    revenue,
    todayTasks,
    todayFollowups,
    clientsRaw: clients,
    settings,
    crmGoals,
    crmFunnel,
    loading: {
      clients: clientsQ.isPending,
      invoices: invoicesQ.isPending,
      tasks: tasksQ.isPending,
      followups: followupsQ.isPending,
      settings: settingsQ.isPending,
      contacts: contactsQ.isPending,
      prospectionSettings: prospectionSettingsQ.isPending,
      weeklyCounts: weeklyCountsQ.isPending,
      dailyMessages: dailyMessagesQ.isPending,
    },
    error: {
      clients: clientsQ.error,
      invoices: invoicesQ.error,
      tasks: tasksQ.error,
      followups: followupsQ.error,
      settings: settingsQ.error,
      contacts: contactsQ.error,
      prospectionSettings: prospectionSettingsQ.error,
      weeklyCounts: weeklyCountsQ.error,
      dailyMessages: dailyMessagesQ.error,
    },
    refetch: {
      clients: clientsQ.refetch,
      invoices: invoicesQ.refetch,
      tasks: tasksQ.refetch,
      followups: followupsQ.refetch,
      settings: settingsQ.refetch,
      contacts: contactsQ.refetch,
      prospectionSettings: prospectionSettingsQ.refetch,
      weeklyCounts: weeklyCountsQ.refetch,
      dailyMessages: dailyMessagesQ.refetch,
    },
  }
}

export type DashboardData = ReturnType<typeof useDashboardData>
