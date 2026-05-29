import { parisDateStartToUtcIso } from '@/features/dashboard/dates'
import { supabase } from '@/lib/supabase'
import type {
  Contact,
  ContactInsert,
  ContactUpdate,
  ContactStage,
  Followup,
  Interaction,
  ProspectionSettings,
  ProspectionSettingsUpsert,
} from '@/types/database'

// =====================================================================
// Contacts CRUD
// =====================================================================

export interface ContactListFilter {
  /** When set, only contacts with this stage. */
  stage?: ContactStage
  /** Case-insensitive substring across first_name/last_name/company/niche. */
  search?: string
  /** When true, include archived contacts. Defaults to false. */
  archived?: boolean
}

export async function listContacts(
  filter: ContactListFilter = {}
): Promise<Contact[]> {
  let query = supabase
    .from('contacts')
    .select('*')
    .order('updated_at', { ascending: false })

  if (!filter.archived) {
    query = query.is('archived_at', null)
  }
  if (filter.stage) {
    query = query.eq('stage', filter.stage)
  }
  if (filter.search && filter.search.trim()) {
    const s = `%${filter.search.trim()}%`
    // ilike across 4 columns via .or()
    query = query.or(
      `first_name.ilike.${s},last_name.ilike.${s},company.ilike.${s},niche.ilike.${s}`
    )
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getContact(id: string): Promise<Contact> {
  const { data, error } = await supabase
    .from('contacts').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function createContact(
  input: Omit<ContactInsert, 'user_id'>
): Promise<Contact> {
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) throw new Error('Non authentifié')
  const { data, error } = await supabase
    .from('contacts')
    .insert({ ...input, user_id: user.id })
    .select('*').single()
  if (error) throw error
  return data
}

export async function updateContact(
  id: string,
  patch: ContactUpdate
): Promise<Contact> {
  const { data, error } = await supabase
    .from('contacts').update(patch).eq('id', id).select('*').single()
  if (error) throw error
  return data
}

export async function archiveContact(id: string): Promise<void> {
  const { error } = await supabase
    .from('contacts')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function unarchiveContact(id: string): Promise<void> {
  const { error } = await supabase
    .from('contacts')
    .update({ archived_at: null })
    .eq('id', id)
  if (error) throw error
}

// =====================================================================
// RPC: change stage
// =====================================================================

export async function changeContactStage(
  contactId: string,
  newStage: ContactStage
): Promise<ContactStage> {
  const { data, error } = await supabase.rpc('change_contact_stage', {
    p_contact_id: contactId,
    p_new_stage: newStage,
  })
  if (error) throw mapRpcError(error)
  return data as ContactStage
}

// =====================================================================
// Followups
// =====================================================================

/**
 * Returned by listPendingFollowupsWithContact — denormalized for the
 * Followups page so each row can render the contact name without
 * a second fetch.
 */
export type PendingFollowup = Followup & {
  contact: Pick<Contact, 'id' | 'first_name' | 'last_name' | 'company' | 'stage'>
}

/**
 * All pending followups for the current user, with embedded contact info.
 * Buckets (overdue/today/upcoming) are computed front-side from this list.
 */
export async function listPendingFollowupsWithContact(): Promise<PendingFollowup[]> {
  const { data, error } = await supabase
    .from('followups')
    .select(`
      id, contact_id, type, followup_index, scheduled_at,
      status, done_at, cancelled_at, note, created_at,
      contact:contacts!inner(id, first_name, last_name, company, stage)
    `)
    .eq('status', 'pending')
    .order('scheduled_at', { ascending: true })
  if (error) throw error
  // Supabase returns `contact` as the embedded shape; cast confidently.
  return (data ?? []) as unknown as PendingFollowup[]
}

/**
 * Returned by listAwaitingDecisionContacts — slim contact projection
 * enriched with prospect_followup history stats (how many done, last done at,
 * max index reached). Drives the "Fin de relance" tab where the operator
 * picks A répondu / Abandonné manually after the relance chain ran out.
 */
export type AwaitingContact = Pick<
  Contact,
  'id' | 'first_name' | 'last_name' | 'company' | 'niche' | 'source' | 'updated_at'
> & {
  followups_done_count: number
  max_followup_index: number
  last_followup_done_at: string | null
}

/**
 * Active contacts stuck in 'message_sent' with no pending followup —
 * i.e. the relance chain hit max_followups, the operator marked the last
 * relance Fait, but didn't get a reply. Front-end uses this list to let
 * the operator decide manually (A répondu / Abandonné).
 */
export async function listAwaitingDecisionContacts(): Promise<AwaitingContact[]> {
  // 1. Active contacts currently in message_sent
  const { data: contacts, error: cErr } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, company, niche, source, updated_at')
    .is('archived_at', null)
    .eq('stage', 'message_sent')
  if (cErr) throw cErr
  if (!contacts || contacts.length === 0) return []

  // 2. Which of those have a pending followup? They're NOT awaiting.
  const ids = contacts.map(c => c.id)
  const { data: pendingFu, error: pErr } = await supabase
    .from('followups')
    .select('contact_id')
    .eq('status', 'pending')
    .in('contact_id', ids)
  if (pErr) throw pErr
  const hasPending = new Set((pendingFu ?? []).map(f => f.contact_id))
  const awaiting = contacts.filter(c => !hasPending.has(c.id))
  if (awaiting.length === 0) return []

  // 3. Enrich with prospect_followup history stats
  const awaitingIds = awaiting.map(c => c.id)
  const { data: doneFu, error: dErr } = await supabase
    .from('followups')
    .select('contact_id, followup_index, done_at')
    .eq('status', 'done')
    .eq('type', 'prospect_followup')
    .in('contact_id', awaitingIds)
  if (dErr) throw dErr

  const stats = new Map<string, { count: number; maxIndex: number; lastDoneAt: string | null }>()
  for (const f of doneFu ?? []) {
    const cur = stats.get(f.contact_id) ?? { count: 0, maxIndex: 0, lastDoneAt: null }
    cur.count += 1
    if (f.followup_index && f.followup_index > cur.maxIndex) cur.maxIndex = f.followup_index
    if (f.done_at && (cur.lastDoneAt === null || f.done_at > cur.lastDoneAt)) cur.lastDoneAt = f.done_at
    stats.set(f.contact_id, cur)
  }

  return awaiting.map(c => {
    const s = stats.get(c.id)
    return {
      ...c,
      followups_done_count: s?.count ?? 0,
      max_followup_index: s?.maxIndex ?? 0,
      last_followup_done_at: s?.lastDoneAt ?? null,
    }
  })
}

export async function listFollowupsForContact(contactId: string): Promise<Followup[]> {
  const { data, error } = await supabase
    .from('followups')
    .select('*')
    .eq('contact_id', contactId)
    .order('scheduled_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function completeFollowup(
  followupId: string,
  note?: string | null
): Promise<void> {
  const { error } = await supabase.rpc('complete_followup', {
    p_followup_id: followupId,
    p_note: note ?? null,
  })
  if (error) throw mapRpcError(error)
}

/**
 * Bump scheduled_at to tomorrow 09:00 Europe/Paris. Pure UPDATE, no RPC —
 * no business side effects (status stays 'pending').
 */
export async function postponeFollowupToTomorrow(followupId: string): Promise<void> {
  // Build "tomorrow 09:00 Europe/Paris" in JS using locale-aware Date math.
  const now = new Date()
  const parisYmd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
  const [y, m, d] = parisYmd.split('-').map(Number)
  const naive = new Date(Date.UTC(y, m - 1, d + 1, 9, 0, 0))
  const offsetMinutes = parisOffsetMinutes(naive)
  const target = new Date(naive.getTime() - offsetMinutes * 60_000)
  const { error } = await supabase
    .from('followups')
    .update({ scheduled_at: target.toISOString() })
    .eq('id', followupId)
  if (error) throw error
}

function parisOffsetMinutes(at: Date): number {
  // Returns the offset (in minutes) that Europe/Paris is ahead of UTC at `at`.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(at).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value
    return acc
  }, {})
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === '24' ? '00' : parts.hour),
    Number(parts.minute),
    Number(parts.second),
  )
  return Math.round((asUtc - at.getTime()) / 60_000)
}

// =====================================================================
// Interactions / notes
// =====================================================================

export async function listInteractions(contactId: string): Promise<Interaction[]> {
  const { data, error } = await supabase
    .from('interactions')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createNote(
  contactId: string,
  body: string
): Promise<Interaction> {
  const { data, error } = await supabase
    .from('interactions')
    .insert({
      contact_id: contactId,
      type: 'note',
      payload: { body },
    })
    .select('*').single()
  if (error) throw error
  return data
}

export async function updateNote(
  interactionId: string,
  body: string
): Promise<Interaction> {
  const { data, error } = await supabase
    .from('interactions')
    .update({ payload: { body } })
    .eq('id', interactionId)
    .select('*').single()
  if (error) throw error
  return data
}

export async function deleteNote(interactionId: string): Promise<void> {
  const { error } = await supabase
    .from('interactions').delete().eq('id', interactionId)
  if (error) throw error
}

// =====================================================================
// Prospection settings
// =====================================================================

export async function getProspectionSettings(): Promise<ProspectionSettings | null> {
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) throw new Error('Non authentifié')
  const { data, error } = await supabase
    .from('prospection_settings')
    .select('*').eq('user_id', user.id).maybeSingle()
  if (error) throw error
  return data
}

export async function upsertProspectionSettings(
  input: Omit<ProspectionSettingsUpsert, 'user_id'>
): Promise<ProspectionSettings> {
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) throw new Error('Non authentifié')
  const { data, error } = await supabase
    .from('prospection_settings')
    .upsert({ ...input, user_id: user.id })
    .select('*').single()
  if (error) throw error
  return data
}

/**
 * Store a one-time code on the current user's settings row, used by the
 * Telegram deep link (t.me/<bot>?start=<code>). The bot's /start handler binds
 * the chat to this account and consumes the code.
 */
export async function setTelegramLinkCode(code: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) throw new Error('Non authentifié')
  const { error } = await supabase
    .from('prospection_settings')
    .upsert({ user_id: user.id, telegram_link_code: code })
  if (error) throw error
}

/** Unlink Telegram for the current user (clears chat id + any pending code). */
export async function disconnectTelegram(): Promise<void> {
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) throw new Error('Non authentifié')
  const { error } = await supabase
    .from('prospection_settings')
    .update({ telegram_chat_id: null, telegram_link_code: null })
    .eq('user_id', user.id)
  if (error) throw error
}

// =====================================================================
// Weekly activity aggregation (Dashboard CrmGoalsWidget)
// =====================================================================

export interface CrmWeeklyCounts {
  /** Stage transitions to 'message_sent' since weekStart + prospect followups marked done since weekStart */
  messages: number
  /** Stage transitions to 'call_booked' since weekStart */
  calls: number
}

/**
 * Count CRM weekly activity since `weekStartISO` (inclusive, Paris-local).
 *
 * - messages = (stage_change → 'message_sent' since weekStart)
 *            + (prospect_followup with status='done' since weekStart)
 *   = "total outbound effort" semantics: new first contacts AND follow-ups
 *
 * - calls = (stage_change → 'call_booked' since weekStart)
 *
 * Uses head=true count queries (no row payload transferred). RLS scopes
 * each query to the authenticated user's contacts automatically.
 */
export async function countCrmWeeklyActivity(weekStartISO: string): Promise<CrmWeeklyCounts> {
  const since = parisDateStartToUtcIso(weekStartISO)

  const [msgsRes, callsRes, fuRes] = await Promise.all([
    supabase
      .from('interactions')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'stage_change')
      .eq('payload->>new_stage' as never, 'message_sent')
      .gte('created_at', since),
    supabase
      .from('interactions')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'stage_change')
      .eq('payload->>new_stage' as never, 'call_booked')
      .gte('created_at', since),
    supabase
      .from('followups')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'prospect_followup')
      .eq('status', 'done')
      .gte('done_at', since),
  ])

  if (msgsRes.error) throw msgsRes.error
  if (callsRes.error) throw callsRes.error
  if (fuRes.error) throw fuRes.error

  return {
    messages: (msgsRes.count ?? 0) + (fuRes.count ?? 0),
    calls: callsRes.count ?? 0,
  }
}

/**
 * Number of *new* messages sent today (Paris-local), net of corrections.
 *
 * Counts distinct contacts who have a stage_change → 'message_sent' interaction
 * dated today AND whose CURRENT stage is not 'to_contact'. The current-stage
 * filter is what makes it net: moving a contact to message_sent then back to
 * to_contact (mistake) drops it from the count, while a contact who advanced
 * past message_sent the same day (replied, closed_lost…) still counts — a
 * message was genuinely sent. Distinct contact_id dedupes back-and-forth toggles.
 *
 * Relances (prospect_followup done) are intentionally excluded — this is the
 * "first contacts sent today" metric only (see dashboard CrmGoalsWidget).
 */
export async function countMessagesSentToday(todayISO: string): Promise<number> {
  const since = parisDateStartToUtcIso(todayISO)

  const { data, error } = await supabase
    .from('interactions')
    .select('contact_id, contact:contacts!inner(stage)')
    .eq('type', 'stage_change')
    .eq('payload->>new_stage' as never, 'message_sent')
    .gte('created_at', since)
  if (error) throw error

  const seen = new Set<string>()
  for (const row of (data ?? []) as unknown as Array<{
    contact_id: string
    contact: { stage: ContactStage }
  }>) {
    if (row.contact.stage === 'to_contact') continue
    seen.add(row.contact_id)
  }
  return seen.size
}

// =====================================================================
// Error mapping
// =====================================================================

/**
 * Translate Postgres exception codes raised by the RPCs into French
 * user-facing messages.
 */
export function mapRpcError(error: { code?: string; message?: string }): Error {
  if (error.code === 'P0002') return new Error('Élément introuvable.')
  if (error.code === '42501') return new Error('Action non autorisée.')
  if (error.code === '22000') return new Error('Cette relance a déjà été traitée.')
  return new Error(error.message ?? 'Une erreur est survenue.')
}
