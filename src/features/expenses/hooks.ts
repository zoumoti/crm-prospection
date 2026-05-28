import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from './api'

const KEY = ['expenses'] as const

export function useExpenses() {
  return useQuery({ queryKey: KEY, queryFn: api.listExpenses })
}

export function useExpense(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => api.getExpense(id!),
    enabled: !!id,
  })
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: [...KEY, 'categories'],
    queryFn: api.listDistinctCategories,
  })
}

export function useCreateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createExpense,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
    },
  })
}

export function useUpdateExpense(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof api.updateExpense>[1]) =>
      api.updateExpense(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, id] })
    },
  })
}

export function useArchiveExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.archiveExpense(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
