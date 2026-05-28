import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from './api'
import type { CompanySettings } from '@/types/database'

const KEY = ['settings'] as const

export function useCompanySettings() {
  return useQuery({ queryKey: KEY, queryFn: api.getCompanySettings })
}

export function useUpsertSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<Omit<CompanySettings, 'user_id' | 'updated_at'>>) =>
      api.upsertCompanySettings(patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUploadLogo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => api.uploadLogo(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, 'logo-url'] })
    },
  })
}

export function useDeleteLogo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.deleteLogo(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, 'logo-url'] })
    },
  })
}

export function useLogoUrl() {
  const settingsQuery = useCompanySettings()
  const logoPath = settingsQuery.data?.logo_path ?? null
  return useQuery({
    queryKey: [...KEY, 'logo-url', logoPath],
    queryFn: () => (logoPath ? api.getLogoSignedUrl(logoPath) : Promise.resolve(null)),
    enabled: settingsQuery.isSuccess,
    staleTime: 50 * 60_000,
  })
}

const REQUIRED_FOR_INVOICE: (keyof CompanySettings)[] = [
  'legal_name',
  'address',
  'siret',
  'iban',
  'bic',
  'vat_mention',
]

export function useCanCreateInvoice() {
  const { data: settings, isLoading } = useCompanySettings()
  if (isLoading) {
    return { canCreate: false, missingFields: REQUIRED_FOR_INVOICE as string[], isLoading: true }
  }
  const missingFields = REQUIRED_FOR_INVOICE.filter((k) => !settings?.[k])
  return { canCreate: missingFields.length === 0, missingFields: missingFields as string[], isLoading: false }
}
