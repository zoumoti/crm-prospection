import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from './api'

const KEY = ['tax_declarations'] as const

export function useTaxDeclarations() {
  return useQuery({ queryKey: KEY, queryFn: api.listTaxDeclarations })
}

export function useCreateTaxDeclaration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createTaxDeclaration,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteTaxDeclaration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteTaxDeclaration(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
