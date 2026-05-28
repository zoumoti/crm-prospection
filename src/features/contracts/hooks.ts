import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from './api'

const KEY = ['contracts'] as const

export function useContracts() {
  return useQuery({ queryKey: KEY, queryFn: api.listContracts })
}

export function useContractsByClient(clientId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'by-client', clientId],
    queryFn: () => api.listContractsByClient(clientId!),
    enabled: !!clientId,
  })
}

export function useContract(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => api.getContract(id!),
    enabled: !!id,
  })
}

export function useCreateContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createContract,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateContract(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof api.updateContract>[1]) =>
      api.updateContract(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, id] })
    },
  })
}

export function useArchiveContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.archiveContract(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
