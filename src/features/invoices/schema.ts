import { z } from 'zod'

function parseFrenchNumber(v: string): number {
  const trimmed = v.trim().replace(/\s/g, '').replace(',', '.')
  return Number(trimmed)
}

export const IMPORTED_PDF_MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export const importedPdfFileSchema = z
  .instanceof(File)
  .refine((f) => f.type === 'application/pdf', 'Le fichier doit être un PDF')
  .refine((f) => f.size <= IMPORTED_PDF_MAX_BYTES, 'PDF trop volumineux (max 10 Mo)')

export const invoiceLineSchema = z.object({
  reference: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  description: z.string().trim().min(1, 'Description requise'),
  unit_price_ht: z
    .string()
    .transform((v) => parseFrenchNumber(v))
    .refine((v) => Number.isFinite(v) && v >= 0, 'Prix invalide'),
  quantity: z
    .string()
    .transform((v) => parseFrenchNumber(v))
    .refine((v) => Number.isFinite(v) && v > 0, 'Quantité invalide'),
})

export const invoiceFormSchema = z.object({
  client_id: z.string().uuid('Client requis'),
  invoice_number: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => v === '' || /^F\d{1,6}$/.test(v), 'Format: F suivi de 1 à 6 chiffres (ex: F00018)')
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide'),
  due_mode: z.enum(['on_receipt', '30_days', 'custom']),
  due_date_custom: z
    .string()
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  payment_method: z.string().trim().min(1, 'Mode de règlement requis'),
  lines: z.array(invoiceLineSchema).min(1, 'Au moins une ligne'),
  // Imported PDF (create flow only, optional). When present, the invoice is
  // marked as imported and the file becomes the source of truth for preview
  // and download. The structured fields above are still required for
  // dashboards, filters, and cotisation calculations.
  imported_pdf_file: importedPdfFileSchema.optional(),
})

export type InvoiceFormValues = z.input<typeof invoiceFormSchema>
export type InvoiceFormOutput = z.output<typeof invoiceFormSchema>
export type InvoiceLineFormValues = z.input<typeof invoiceLineSchema>
export type InvoiceLineFormOutput = z.output<typeof invoiceLineSchema>

export function emptyLine(): InvoiceLineFormValues {
  return { reference: '', description: '', unit_price_ht: '', quantity: '1' }
}

export function emptyInvoiceForm(today: string): InvoiceFormValues {
  return {
    client_id: '',
    invoice_number: '',
    invoice_date: today,
    due_mode: 'on_receipt',
    due_date_custom: '',
    payment_method: 'Virement bancaire',
    lines: [emptyLine()],
    imported_pdf_file: undefined,
  }
}

export function computeDueDate(values: Pick<InvoiceFormOutput, 'due_mode' | 'invoice_date' | 'due_date_custom'>): string | null {
  if (values.due_mode === 'on_receipt') return null
  if (values.due_mode === '30_days') {
    const d = new Date(values.invoice_date)
    d.setDate(d.getDate() + 30)
    return d.toISOString().slice(0, 10)
  }
  return values.due_date_custom
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}
