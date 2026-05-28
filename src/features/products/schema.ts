import { z } from 'zod'

const optionalString = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable()

function parseFrenchNumber(v: string): number | null {
  const trimmed = v.trim().replace(/\s/g, '').replace(',', '.')
  if (trimmed === '') return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : NaN
}

export const productFormSchema = z.object({
  reference: z.string().trim().min(1, 'Référence requise').max(100),
  description: z.string().trim().min(1, 'Description requise'),
  default_price_ht: z
    .string()
    .transform((v) => parseFrenchNumber(v))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0), 'Prix invalide')
    .nullable(),
})

export type ProductFormValues = z.input<typeof productFormSchema>
export type ProductFormOutput = z.output<typeof productFormSchema>

export const emptyProductForm: ProductFormValues = {
  reference: '',
  description: '',
  default_price_ht: '',
}

export { optionalString }
