import { supabase } from '@/lib/supabase'
import type { CompanySettings, CompanySettingsUpsert } from '@/types/database'

export async function getCompanySettings(): Promise<CompanySettings | null> {
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) throw new Error('Non authentifié')
  const { data, error } = await supabase
    .from('company_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertCompanySettings(
  patch: Partial<Omit<CompanySettings, 'user_id' | 'updated_at'>>
): Promise<CompanySettings> {
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) throw new Error('Non authentifié')
  const row: CompanySettingsUpsert = { user_id: user.id, ...patch }
  const { data, error } = await supabase
    .from('company_settings')
    .upsert(row, { onConflict: 'user_id' })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function uploadLogo(file: File): Promise<string> {
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) throw new Error('Non authentifié')
  const ext = (file.name.split('.').pop() ?? 'png').toLowerCase()
  const path = `${user.id}/logo.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('company-assets')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (uploadError) throw uploadError
  await upsertCompanySettings({ logo_path: path })
  return path
}

export async function deleteLogo(): Promise<void> {
  const settings = await getCompanySettings()
  if (!settings?.logo_path) return
  const { error: removeError } = await supabase.storage
    .from('company-assets')
    .remove([settings.logo_path])
  if (removeError) throw removeError
  await upsertCompanySettings({ logo_path: null })
}

export async function getLogoSignedUrl(logoPath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('company-assets')
    .createSignedUrl(logoPath, 3600)
  if (error) throw error
  return data.signedUrl
}
