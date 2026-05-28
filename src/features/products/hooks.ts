import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from './api'
import type { ProductInsert, ProductUpdate } from '@/types/database'

const KEY = ['products'] as const

export function useProducts() {
  return useQuery({ queryKey: KEY, queryFn: api.listProducts })
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => api.getProduct(id!),
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<ProductInsert, 'user_id'>) => api.createProduct(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateProduct(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: ProductUpdate) => api.updateProduct(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, id] })
    },
  })
}

export function useArchiveProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.archiveProduct(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
