import { z } from 'zod'

export const RECEIPT_ACCEPTED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const

export const RECEIPT_MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

export const RECEIPT_ACCEPT_ATTR =
  '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'

function parseFrenchNumber(v: string): number {
  const trimmed = v.trim().replace(/\s/g, '').replace(',', '.')
  return Number(trimmed)
}

export const receiptFileSchema = z
  .instanceof(File)
  .refine((f) => f.size <= RECEIPT_MAX_SIZE_BYTES, 'Fichier trop volumineux (max 5 Mo)')
  .refine(
    (f) => (RECEIPT_ACCEPTED_MIMES as readonly string[]).includes(f.type),
    'Format non supporté (PDF, JPG, PNG uniquement)'
  )

export const expenseFormSchema = z.object({
  amount: z
    .string()
    .transform((v) => parseFrenchNumber(v))
    .refine((v) => Number.isFinite(v) && v > 0, 'Montant invalide (doit être > 0)'),
  category: z.string().trim().min(1, 'Catégorie requise').max(50),
  description: z.string().trim().min(1, 'Description requise').max(500),
  expense_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide'),
  file: receiptFileSchema.optional(),
  removeReceipt: z.boolean().optional(),
})

export type ExpenseFormValues = z.input<typeof expenseFormSchema>
export type ExpenseFormOutput = z.output<typeof expenseFormSchema>

export function emptyExpenseForm(today: string): ExpenseFormValues {
  return {
    amount: '',
    category: '',
    description: '',
    expense_date: today,
    file: undefined,
    removeReceipt: false,
  }
}
