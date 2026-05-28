import { z } from 'zod'

const optionalString = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable()

export const portalLinkSchema = z.object({
  label: z.string().trim().min(1, 'Label requis').max(60),
  url: z
    .string()
    .trim()
    .refine((v) => /^https?:\/\/.+/i.test(v), 'URL invalide (http(s) requis)'),
})

export const clientFormSchema = z.object({
  first_name: z.string().trim().min(1, 'Prénom requis').max(80),
  last_name: z.string().trim().min(1, 'Nom requis').max(80),
  company: optionalString,
  siret: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s/g, ''))
    .refine((v) => v === '' || /^\d{14}$/.test(v), 'SIRET = 14 chiffres')
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  address: optionalString,
  email: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || z.string().email().safeParse(v).success,
      'Email invalide'
    )
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  phone: optionalString,
  instagram: optionalString,
  linkedin: optionalString,
  tiktok: optionalString,
  notes: optionalString,
  start_date: z
    .string()
    .refine(
      (v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v),
      'Date invalide'
    )
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  portal_links: z.array(portalLinkSchema),
})

export type ClientFormValues = z.input<typeof clientFormSchema>
export type ClientFormOutput = z.output<typeof clientFormSchema>

export const emptyClientForm: ClientFormValues = {
  first_name: '',
  last_name: '',
  company: '',
  siret: '',
  address: '',
  email: '',
  phone: '',
  instagram: '',
  linkedin: '',
  tiktok: '',
  notes: '',
  start_date: '',
  portal_links: [],
}

export function emptyPortalLink(): { label: string; url: string } {
  return { label: '', url: '' }
}
