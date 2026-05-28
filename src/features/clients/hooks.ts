import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from './api'
import type { ClientInsert, ClientUpdate } from '@/types/database'

const KEY = ['clients'] as const

export function useClients() {
  return useQuery({ queryKey: KEY, queryFn: api.listClients })
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => api.getClient(id!),
    enabled: !!id,
  })
}

export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<ClientInsert, 'user_id'>) => api.createClient(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateClient(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: ClientUpdate) => api.updateClient(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, id] })
    },
  })
}

export function useArchiveClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.archiveClient(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
