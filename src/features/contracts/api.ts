import { supabase } from '@/lib/supabase'
import type { Contract, ContractUpdate } from '@/types/database'

export async function listContracts(): Promise<Contract[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .is('archived_at', null)
    .order('signed_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function listContractsByClient(clientId: string): Promise<Contract[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('client_id', clientId)
    .is('archived_at', null)
    .order('signed_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getContract(id: string): Promise<Contract> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function getContractSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('contracts')
    .createSignedUrl(storagePath, 3600) // 1 hour TTL
  if (error) throw error
  return data.signedUrl
}

function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 100)
}

export async function createContract(input: {
  client_id: string
  name: string
  signed_at: string
  notes: string | null
  file: File
}): Promise<Contract> {
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) throw new Error('Non authentifié')

  const contractId = crypto.randomUUID()
  const path = `${user.id}/${contractId}/${sanitizeFilename(input.file.name)}`

  // 1. Upload Storage
  const { error: upErr } = await supabase.storage
    .from('contracts')
    .upload(path, input.file, {
      contentType: input.file.type,
      upsert: false,
    })
  if (upErr) throw upErr

  // 2. Insert DB
  const { data, error: insErr } = await supabase
    .from('contracts')
    .insert({
      id: contractId,
      user_id: user.id,
      client_id: input.client_id,
      name: input.name,
      signed_at: input.signed_at,
      storage_path: path,
      file_name: input.file.name,
      file_size: input.file.size,
      mime_type: input.file.type,
      notes: input.notes,
    })
    .select('*')
    .single()

  // 3. Rollback Storage if DB insert fails
  if (insErr) {
    await supabase.storage
      .from('contracts')
      .remove([path])
      .catch((rollbackErr) =>
        console.error('[contracts] storage rollback after failed insert', { path, rollbackErr })
      )
    throw insErr
  }
  return data
}

export async function updateContract(
  id: string,
  input: {
    client_id: string
    name: string
    signed_at: string
    notes: string | null
    newFile?: File
    currentStoragePath: string
  }
): Promise<Contract> {
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) throw new Error('Non authentifié')

  let newPath: string | undefined
  let fileMeta: Partial<ContractUpdate> = {}

  if (input.newFile) {
    newPath = `${user.id}/${id}/${Date.now()}-${sanitizeFilename(input.newFile.name)}`
    const { error: upErr } = await supabase.storage
      .from('contracts')
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
  }

  const { data, error } = await supabase
    .from('contracts')
    .update({
      client_id: input.client_id,
      name: input.name,
      signed_at: input.signed_at,
      notes: input.notes,
      ...fileMeta,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    if (newPath) {
      await supabase.storage
        .from('contracts')
        .remove([newPath])
        .catch((rollbackErr) =>
          console.error('[contracts] storage rollback after failed update', { newPath, rollbackErr })
        )
    }
    throw error
  }

  if (newPath && input.currentStoragePath !== newPath) {
    await supabase.storage
      .from('contracts')
      .remove([input.currentStoragePath])
      .catch(() => {
        /* old file orphaned in storage, not fatal */
      })
  }

  return data
}

export async function archiveContract(id: string): Promise<void> {
  // Soft delete: file kept in Storage.
  const { error } = await supabase
    .from('contracts')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
