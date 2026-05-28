import { supabase } from '@/lib/supabase'
import type { TaxDeclaration, TaxDeclarationInsert } from '@/types/database'

export async function listTaxDeclarations(): Promise<TaxDeclaration[]> {
  const { data, error } = await supabase
    .from('tax_declarations')
    .select('*')
    .order('period_year', { ascending: false })
    .order('period_index', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createTaxDeclaration(
  input: Omit<TaxDeclarationInsert, 'user_id'>
): Promise<TaxDeclaration> {
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) throw new Error('Non authentifié')
  const { data, error } = await supabase
    .from('tax_declarations')
    .insert({ ...input, user_id: user.id })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteTaxDeclaration(id: string): Promise<void> {
  const { error } = await supabase.from('tax_declarations').delete().eq('id', id)
  if (error) throw error
}
