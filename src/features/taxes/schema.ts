import { z } from 'zod'

function parseFrenchNumber(v: string): number {
  const trimmed = v.trim().replace(/\s/g, '').replace(',', '.')
  return Number(trimmed)
}

export const taxSettingsSchema = z.object({
  tax_rate: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : parseFrenchNumber(v)))
    .refine(
      (v) => v === null || (Number.isFinite(v) && v >= 0 && v <= 100),
      'Taux invalide (entre 0 et 100)'
    )
    .nullable(),
  tax_acre: z.boolean(),
  tax_frequency: z.enum(['monthly', 'quarterly']),
})

export type TaxSettingsValues = z.input<typeof taxSettingsSchema>
export type TaxSettingsOutput = z.output<typeof taxSettingsSchema>

export const emptyTaxSettingsForm: TaxSettingsValues = {
  tax_rate: '',
  tax_acre: false,
  tax_frequency: 'quarterly',
}
