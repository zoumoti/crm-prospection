import { z } from 'zod'

const optionalString = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable()

export const taskFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Titre requis').max(200),
    notes: optionalString,
    due_date: z
      .string()
      .refine(
        (v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v),
        'Date invalide'
      )
      .transform((v) => (v === '' ? null : v))
      .nullable(),
    priority: z.enum(['high', 'normal', 'low']),
    client_id: z.string().uuid().nullable(),
    assignee: z.enum(['owner', 'client']),
  })
  .refine(
    (v) => v.assignee === 'owner' || v.client_id !== null,
    { path: ['client_id'], message: 'Choisissez un client pour cette tâche' }
  )

export type TaskFormValues = z.input<typeof taskFormSchema>
export type TaskFormOutput = z.output<typeof taskFormSchema>

export const emptyTaskForm: TaskFormValues = {
  title: '',
  notes: '',
  due_date: '',
  priority: 'normal',
  client_id: null,
  assignee: 'owner',
}
