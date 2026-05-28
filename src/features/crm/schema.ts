import { z } from 'zod'

const STAGES = [
  'to_contact', 'message_sent', 'replied',
  'booking_link_sent', 'call_booked', 'closed_won', 'closed_lost',
] as const

const SOURCES = ['linkedin', 'instagram', 'twitter', 'tiktok', 'email', 'other'] as const

/**
 * Empty string is coerced to null on output for nullable optional fields
 * (matches the DB schema where these columns are `text` nullable).
 * Uses the same .transform() pattern as clients/schema.ts and tasks/schema.ts.
 */
const emptyToNull = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable()

export const contactFormSchema = z.object({
  first_name: z.string().trim().min(1, 'Prénom requis').max(80),
  last_name:  z.string().trim().min(1, 'Nom requis').max(80),
  company:    emptyToNull.pipe(z.string().max(160).nullable()),
  job_title:  emptyToNull.pipe(z.string().max(120).nullable()),
  email:      z
    .string()
    .trim()
    .refine(
      (v) => v === '' || z.string().email().safeParse(v).success,
      'Email invalide',
    )
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  phone:      emptyToNull,
  source:     z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .pipe(z.enum(SOURCES).nullable()),
  source_url: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || z.string().url().safeParse(v).success,
      'URL invalide',
    )
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  niche:      emptyToNull.pipe(z.string().max(120).nullable()),
  stage:      z.enum(STAGES).default('to_contact'),
  loom_url:   z
    .string()
    .trim()
    .refine(
      (v) => v === '' || z.string().url().safeParse(v).success,
      'URL Loom invalide',
    )
    .transform((v) => (v === '' ? null : v))
    .nullable(),
})

export type ContactFormValues = z.input<typeof contactFormSchema>
export type ContactFormOutput = z.output<typeof contactFormSchema>

export const emptyContactForm: ContactFormValues = {
  first_name: '',
  last_name: '',
  company: '',
  job_title: '',
  email: '',
  phone: '',
  source: '',
  source_url: '',
  niche: '',
  stage: 'to_contact',
  loom_url: '',
}

export const noteSchema = z.object({
  body: z.string().trim().min(1, 'La note ne peut être vide').max(4000),
})
export type NoteFormValues = z.infer<typeof noteSchema>

export const prospectionSettingsSchema = z.object({
  weekly_message_goal: z
    .string()
    .or(z.number())
    .or(z.null())
    .transform((v) => (v === '' || v === null ? null : Number(v)))
    .pipe(z.number().int().min(0).max(10000).nullable()),
  weekly_call_goal: z
    .string()
    .or(z.number())
    .or(z.null())
    .transform((v) => (v === '' || v === null ? null : Number(v)))
    .pipe(z.number().int().min(0).max(10000).nullable()),
  followup_1_days:            z.coerce.number().int().min(1).max(365),
  followup_2_days:            z.coerce.number().int().min(1).max(365),
  conversation_followup_days: z.coerce.number().int().min(1).max(365),
  max_followups:              z.coerce.number().int().min(1).max(10),
  telegram_chat_id: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || /^-?\d+$/.test(v),
      'chat_id invalide (chiffres uniquement, négatif autorisé pour les groupes)',
    )
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  daily_recap_enabled: z.coerce.boolean(),
  daily_recap_hour:    z.coerce.number().int().min(0).max(23),
})
export type ProspectionSettingsFormValues = z.input<typeof prospectionSettingsSchema>
export type ProspectionSettingsFormOutput = z.output<typeof prospectionSettingsSchema>

export const emptyProspectionSettingsForm: ProspectionSettingsFormValues = {
  weekly_message_goal: null,
  weekly_call_goal: null,
  followup_1_days: 3,
  followup_2_days: 7,
  conversation_followup_days: 2,
  max_followups: 3,
  telegram_chat_id: '',
  daily_recap_enabled: true,
  daily_recap_hour: 7,
}
