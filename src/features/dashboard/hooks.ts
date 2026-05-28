// src/features/dashboard/hooks.ts
//
// Composite hook orchestrating the dashboard widget queries (prospection only).

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import * as crmApi from '@/features/crm/api'
import {
  computeTodayFollowupsWidget,
  computeCrmGoalsWidget,
  computeCrmFunnelWidget,
} from './api'
import { getTodayISO, getWeekStartISO } from './dates'
import { useCrmWeeklyCounts, useCrmDailyMessageCount } from '@/features/crm/hooks'

export function useDashboardData() {
  const today = useMemo(() => getTodayISO(), [])
  const weekStart = useMemo(() => getWeekStartISO(), [])

  const followupsQ = useQuery({
    queryKey: ['followups', 'pending'],
    queryFn: crmApi.listPendingFollowupsWithContact,
    staleTime: 0,
    refetchOnWindowFocus: true,
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

  const followups = followupsQ.data ?? []
  const contacts = contactsQ.data ?? []
  const prospectionSettings = prospectionSettingsQ.data ?? null
  const weeklyCounts = weeklyCountsQ.data ?? null
  const messagesToday = dailyMessagesQ.data ?? 0

  const todayFollowups = useMemo(
    () => computeTodayFollowupsWidget(followups, today),
    [followups, today]
  )
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
    todayFollowups,
    crmGoals,
    crmFunnel,
    loading: {
      followups: followupsQ.isPending,
      contacts: contactsQ.isPending,
      prospectionSettings: prospectionSettingsQ.isPending,
      weeklyCounts: weeklyCountsQ.isPending,
      dailyMessages: dailyMessagesQ.isPending,
    },
    error: {
      followups: followupsQ.error,
      contacts: contactsQ.error,
      prospectionSettings: prospectionSettingsQ.error,
      weeklyCounts: weeklyCountsQ.error,
      dailyMessages: dailyMessagesQ.error,
    },
    refetch: {
      followups: followupsQ.refetch,
      contacts: contactsQ.refetch,
      prospectionSettings: prospectionSettingsQ.refetch,
      weeklyCounts: weeklyCountsQ.refetch,
      dailyMessages: dailyMessagesQ.refetch,
    },
  }
}

export type DashboardData = ReturnType<typeof useDashboardData>
