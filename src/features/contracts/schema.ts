import { z } from 'zod'

export const ACCEPTED_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
] as const

export const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

export const fileSchema = z
  .instanceof(File)
  .refine((f) => f.size <= MAX_SIZE_BYTES, 'Fichier trop volumineux (max 10 Mo)')
  .refine(
    (f) => (ACCEPTED_MIMES as readonly string[]).includes(f.type),
    'Format non supporté (PDF, DOC, DOCX uniquement)'
  )

const optionalString = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable()

export const contractFormSchema = z.object({
  client_id: z.string().uuid('Client requis'),
  name: z.string().trim().min(1, 'Nom requis').max(120),
  signed_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide'),
  notes: optionalString,
  // Optional at schema level. In create mode the page enforces presence at submit.
  file: fileSchema.optional(),
})

export type ContractFormValues = z.input<typeof contractFormSchema>
export type ContractFormOutput = z.output<typeof contractFormSchema>

export const emptyContractForm: ContractFormValues = {
  client_id: '',
  name: '',
  signed_at: new Date().toISOString().slice(0, 10),
  notes: '',
  file: undefined,
}
