import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getTodayISO, getWeekStartISO } from '@/features/dashboard/dates'
import * as api from './api'
import type {
  Contact, ContactInsert, ContactUpdate, ContactStage,
  ProspectionSettingsUpsert,
} from '@/types/database'

const CONTACTS_KEY = ['contacts'] as const
const FOLLOWUPS_KEY = ['followups'] as const
const INTERACTIONS_KEY = ['interactions'] as const
const SETTINGS_KEY = ['prospection-settings'] as const
// Kept OUT of CONTACTS_KEY hierarchy on purpose: the optimistic
// updater in useChangeStage operates on prefix ['contacts',...] and
// patching the awaiting list with the new stage would temporarily
// show stage='replied'/'closed_lost' rows inside a tab that's supposed
// to only contain stage='message_sent'. Cleaner to invalidate on settled.
const AWAITING_KEY = ['crm-awaiting'] as const

// =====================================================================
// Contacts queries
// =====================================================================

export function useContacts(filter: api.ContactListFilter = {}) {
  return useQuery({
    queryKey: [...CONTACTS_KEY, filter] as const,
    queryFn: () => api.listContacts(filter),
  })
}

export function useContact(id: string | undefined) {
  return useQuery({
    queryKey: [...CONTACTS_KEY, 'one', id] as const,
    queryFn: () => api.getContact(id!),
    enabled: !!id,
  })
}

// =====================================================================
// Contacts mutations
// =====================================================================

export function useCreateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<ContactInsert, 'user_id'>) => api.createContact(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: CONTACTS_KEY }),
  })
}

export function useUpdateContact(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: ContactUpdate) => api.updateContact(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACTS_KEY })
      qc.invalidateQueries({ queryKey: [...CONTACTS_KEY, 'one', id] })
    },
  })
}

export function useArchiveContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.archiveContact(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: CONTACTS_KEY }),
  })
}

/**
 * Drag-Kanban friendly: optimistic UI move + rollback on error.
 * Invalidates everything stage-touching once settled (contacts list,
 * the specific contact, followups, interactions).
 */
export function useChangeStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ contactId, newStage }: { contactId: string; newStage: ContactStage }) =>
      api.changeContactStage(contactId, newStage),
    onMutate: async ({ contactId, newStage }) => {
      await qc.cancelQueries({ queryKey: CONTACTS_KEY })
      // Snapshot ALL ['contacts', ...] queries — both list shapes (Contact[])
      // AND the single-contact detail shape (Contact at ['contacts','one',id]).
      // We restore both kinds on error.
      const snapshot = qc.getQueriesData({ queryKey: CONTACTS_KEY })
      // Patch list-shaped caches only. Single Contact caches (e.g. the open
      // detail drawer) get refreshed via the onSettled invalidation below.
      qc.setQueriesData(
        { queryKey: CONTACTS_KEY },
        (prev: unknown) =>
          Array.isArray(prev)
            ? (prev as Contact[]).map(c => (c.id === contactId ? { ...c, stage: newStage } : c))
            : prev,
      )
      // Also patch the single-contact cache for the open detail drawer so the
      // stage badge / dropdown reflect the new value instantly.
      qc.setQueryData<Contact>(
        [...CONTACTS_KEY, 'one', contactId],
        prev => (prev ? { ...prev, stage: newStage } : prev),
      )
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data))
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: CONTACTS_KEY })
      qc.invalidateQueries({ queryKey: [...CONTACTS_KEY, 'one', vars.contactId] })
      qc.invalidateQueries({ queryKey: FOLLOWUPS_KEY })
      qc.invalidateQueries({ queryKey: [...INTERACTIONS_KEY, vars.contactId] })
      qc.invalidateQueries({ queryKey: AWAITING_KEY })
    },
  })
}

// =====================================================================
// Followups
// =====================================================================

export function useAwaitingDecisionContacts() {
  return useQuery({
    queryKey: AWAITING_KEY,
    queryFn: api.listAwaitingDecisionContacts,
  })
}

export function usePendingFollowups() {
  return useQuery({
    queryKey: [...FOLLOWUPS_KEY, 'pending'] as const,
    queryFn: api.listPendingFollowupsWithContact,
  })
}

export function useFollowupsForContact(contactId: string | undefined) {
  return useQuery({
    queryKey: [...FOLLOWUPS_KEY, 'contact', contactId] as const,
    queryFn: () => api.listFollowupsForContact(contactId!),
    enabled: !!contactId,
  })
}

export function useCompleteFollowup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ followupId, note }: { followupId: string; note?: string | null }) =>
      api.completeFollowup(followupId, note ?? null),
    // No optimistic — side effects (next followup creation OR landing in
    // the awaiting-decision state) make rollback expensive. Always
    // invalidate on settled to resync.
    onSettled: () => {
      qc.invalidateQueries({ queryKey: FOLLOWUPS_KEY })
      qc.invalidateQueries({ queryKey: CONTACTS_KEY })
      qc.invalidateQueries({ queryKey: INTERACTIONS_KEY })
      qc.invalidateQueries({ queryKey: AWAITING_KEY })
    },
  })
}

export function usePostponeFollowup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (followupId: string) => api.postponeFollowupToTomorrow(followupId),
    onSuccess: () => qc.invalidateQueries({ queryKey: FOLLOWUPS_KEY }),
  })
}

// =====================================================================
// Interactions / notes
// =====================================================================

export function useInteractions(contactId: string | undefined) {
  return useQuery({
    queryKey: [...INTERACTIONS_KEY, contactId] as const,
    queryFn: () => api.listInteractions(contactId!),
    enabled: !!contactId,
  })
}

export function useCreateNote(contactId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => api.createNote(contactId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...INTERACTIONS_KEY, contactId] }),
  })
}

export function useUpdateNote(contactId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => api.updateNote(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...INTERACTIONS_KEY, contactId] }),
  })
}

export function useDeleteNote(contactId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteNote(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...INTERACTIONS_KEY, contactId] }),
  })
}

// =====================================================================
// Prospection settings
// =====================================================================

export function useProspectionSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: api.getProspectionSettings,
    // Refetch when the user returns to the tab (e.g. back from Telegram after
    // tapping "Démarrer") so the "connected" state updates on its own.
    refetchOnWindowFocus: true,
  })
}

export function useUpsertProspectionSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<ProspectionSettingsUpsert, 'user_id'>) =>
      api.upsertProspectionSettings(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: SETTINGS_KEY }),
  })
}

export function useSetTelegramLinkCode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (code: string) => api.setTelegramLinkCode(code),
    onSuccess: () => qc.invalidateQueries({ queryKey: SETTINGS_KEY }),
  })
}

export function useDisconnectTelegram() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.disconnectTelegram(),
    onSuccess: () => qc.invalidateQueries({ queryKey: SETTINGS_KEY }),
  })
}

// =====================================================================
// Weekly activity (used by Dashboard CrmGoalsWidget)
// =====================================================================

export function useCrmWeeklyCounts() {
  const weekStart = useMemo(() => getWeekStartISO(), [])
  return useQuery({
    queryKey: ['crm', 'weekly-counts', weekStart] as const,
    queryFn: () => api.countCrmWeeklyActivity(weekStart),
    staleTime: 60_000,
  })
}

export function useCrmDailyMessageCount() {
  const today = useMemo(() => getTodayISO(), [])
  return useQuery({
    queryKey: ['crm', 'daily-messages', today] as const,
    queryFn: () => api.countMessagesSentToday(today),
    staleTime: 60_000,
  })
}
