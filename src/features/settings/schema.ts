import { z } from 'zod'

const optionalString = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable()

export const companyIdentitySchema = z.object({
  legal_name: optionalString,
  commercial_name: optionalString,
  address: optionalString,
  siret: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s/g, ''))
    .refine((v) => v === '' || /^\d{14}$/.test(v), 'SIRET = 14 chiffres')
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  phone: optionalString,
  email: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || z.string().email().safeParse(v).success,
      'Email invalide'
    )
    .transform((v) => (v === '' ? null : v))
    .nullable(),
})

export const companyBankingSchema = z.object({
  iban: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s/g, '').toUpperCase())
    .refine(
      (v) => v === '' || /^FR\d{12}[0-9A-Z]{11}\d{2}$/.test(v),
      'IBAN français invalide'
    )
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  bic: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s/g, '').toUpperCase())
    .refine(
      (v) => v === '' || /^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(v),
      'BIC invalide (8 ou 11 caractères)'
    )
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  vat_mention: optionalString,
})

export type CompanyIdentityValues = z.input<typeof companyIdentitySchema>
export type CompanyIdentityOutput = z.output<typeof companyIdentitySchema>
export type CompanyBankingValues = z.input<typeof companyBankingSchema>
export type CompanyBankingOutput = z.output<typeof companyBankingSchema>

export const emptyIdentityForm: CompanyIdentityValues = {
  legal_name: '',
  commercial_name: '',
  address: '',
  siret: '',
  phone: '',
  email: '',
}

export const emptyBankingForm: CompanyBankingValues = {
  iban: '',
  bic: '',
  vat_mention: '',
}
