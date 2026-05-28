import { supabase } from '@/lib/supabase'
import type { Expense, ExpenseUpdate } from '@/types/database'

function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 100)
}

export async function listExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .is('archived_at', null)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getExpense(id: string): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function listDistinctCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('category')
    .is('archived_at', null)
    .order('category', { ascending: true })
  if (error) throw error
  const seen = new Set<string>()
  const out: string[] = []
  for (const row of data ?? []) {
    const k = row.category.trim()
    if (!k) continue
    const kLower = k.toLowerCase()
    if (seen.has(kLower)) continue
    seen.add(kLower)
    out.push(k)
  }
  return out
}

export async function getReceiptSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('expense-receipts')
    .createSignedUrl(storagePath, 3600)
  if (error) throw error
  return data.signedUrl
}

export async function createExpense(input: {
  amount: number
  category: string
  description: string
  expense_date: string
  file?: File
}): Promise<Expense> {
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) throw new Error('Non authentifié')

  const expenseId = crypto.randomUUID()
  let path: string | null = null

  if (input.file) {
    path = `${user.id}/${expenseId}/${sanitizeFilename(input.file.name)}`
    const { error: upErr } = await supabase.storage
      .from('expense-receipts')
      .upload(path, input.file, {
        contentType: input.file.type,
        upsert: false,
      })
    if (upErr) throw upErr
  }

  const { data, error: insErr } = await supabase
    .from('expenses')
    .insert({
      id: expenseId,
      user_id: user.id,
      amount: input.amount,
      category: input.category,
      description: input.description,
      expense_date: input.expense_date,
      storage_path: path,
      file_name: input.file ? input.file.name : null,
      file_size: input.file ? input.file.size : null,
      mime_type: input.file ? input.file.type : null,
    })
    .select('*')
    .single()

  if (insErr) {
    if (path) {
      await supabase.storage
        .from('expense-receipts')
        .remove([path])
        .catch((rollbackErr) =>
          console.error('[expenses] storage rollback after failed insert', { path, rollbackErr })
        )
    }
    throw insErr
  }
  return data
}

export async function updateExpense(
  id: string,
  input: {
    amount: number
    category: string
    description: string
    expense_date: string
    newFile?: File
    removeReceipt?: boolean
    currentStoragePath: string | null
  }
): Promise<Expense> {
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) throw new Error('Non authentifié')

  let newPath: string | undefined
  let fileMeta: Partial<ExpenseUpdate> = {}

  if (input.newFile) {
    newPath = `${user.id}/${id}/${Date.now()}-${sanitizeFilename(input.newFile.name)}`
    const { error: upErr } = await supabase.storage
      .from('expense-receipts')
      .upload(newPath, input.newFile, {
        contentType: input.newFile.type,
        upsert: false,
      })
    if (upErr) throw upErr
    fileMeta = {
      storage_path: newPath,
      file_name: input.newFile.name,
      file_size: input.newFile.size,
      mime_type: input.newFile.type,
    }
  } else if (input.removeReceipt) {
    fileMeta = {
      storage_path: null,
      file_name: null,
      file_size: null,
      mime_type: null,
    }
  }

  const { data, error } = await supabase
    .from('expenses')
    .update({
      amount: input.amount,
      category: input.category,
      description: input.description,
      expense_date: input.expense_date,
      ...fileMeta,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    if (newPath) {
      await supabase.storage
        .from('expense-receipts')
        .remove([newPath])
        .catch((rollbackErr) =>
          console.error('[expenses] storage rollback after failed update', { newPath, rollbackErr })
        )
    }
    throw error
  }

  if ((newPath || input.removeReceipt) && input.currentStoragePath && input.currentStoragePath !== newPath) {
    await supabase.storage
      .from('expense-receipts')
      .remove([input.currentStoragePath])
      .catch(() => {
        /* old file orphaned in storage, not fatal */
      })
  }

  return data
}

export async function archiveExpense(id: string): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
