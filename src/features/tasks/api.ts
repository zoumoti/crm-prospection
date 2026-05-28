import { supabase } from '@/lib/supabase'
import type { Task, TaskInsert, TaskUpdate, TaskCompletedBy } from '@/types/database'

export async function listTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getTask(id: string): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

/**
 * All non-completed tasks of a given client.
 * The card on /clients/:id slices the first 5 for display and uses .length
 * for the "Voir toutes (N)" counter.
 */
export async function listTasksForClient(clientId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('client_id', clientId)
    .eq('completed', false)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createTask(
  input: Omit<TaskInsert, 'owner_id'>
): Promise<Task> {
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) throw new Error('Non authentifié')
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...input, owner_id: user.id })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateTask(id: string, patch: TaskUpdate): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function toggleTask(
  id: string,
  completed: boolean,
  completedBy: TaskCompletedBy = 'owner'
): Promise<Task> {
  const patch: TaskUpdate = completed
    ? { completed: true, completed_at: new Date().toISOString(), completed_by: completedBy }
    : { completed: false, completed_at: null, completed_by: null }
  return updateTask(id, patch)
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}
