import { supabase } from '@/lib/supabase'
import type { Client, ClientInsert, ClientUpdate } from '@/types/database'

export async function listClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .is('archived_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getClient(id: string): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createClient(input: Omit<ClientInsert, 'user_id'>): Promise<Client> {
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) throw new Error('Non authentifié')
  const { data, error } = await supabase
    .from('clients')
    .insert({ ...input, user_id: user.id })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateClient(id: string, patch: ClientUpdate): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function archiveClient(id: string): Promise<void> {
  const { error } = await supabase
    .from('clients')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
