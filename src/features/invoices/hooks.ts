import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from './api'
import type { InvoiceFilters } from './api'
import type { InvoiceInsert, InvoiceUpdate, InvoiceLineInsert } from '@/types/database'

const KEY = ['invoices'] as const

export function useInvoices(filters?: InvoiceFilters) {
  return useQuery({
    queryKey: [...KEY, 'list', filters ?? {}],
    queryFn: () => api.listInvoices(filters),
  })
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => api.getInvoiceWithLines(id!),
    enabled: !!id,
  })
}

export function useCreateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      input,
      lines,
      importedPdf,
    }: {
      input: Omit<InvoiceInsert, 'user_id'>
      lines: Omit<InvoiceLineInsert, 'invoice_id'>[]
      importedPdf?: File | null
    }) => api.createInvoice(input, lines, importedPdf),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateInvoice(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      patch,
      lines,
    }: {
      patch: InvoiceUpdate
      lines: Omit<InvoiceLineInsert, 'invoice_id'>[]
    }) => api.updateInvoice(id, patch, lines),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, id] })
    },
  })
}

export function useMarkPaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, paidAt }: { id: string; paidAt: string }) =>
      api.markPaid(id, paidAt),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, id] })
    },
  })
}

export function useSetPaidAt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, paidAt }: { id: string; paidAt: string }) =>
      api.setPaidAt(id, paidAt),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, id] })
    },
  })
}

export function useMarkUnpaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.markUnpaid(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, id] })
    },
  })
}

export function useArchiveInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.archiveInvoice(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
