import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Trash2 } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Spinner } from '@/components/ui/Spinner'
import { Combobox, type ComboboxOption } from '@/components/ui/Combobox'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { cn } from '@/lib/utils'
import {
  emptyTaskForm,
  taskFormSchema,
  type TaskFormOutput,
  type TaskFormValues,
} from '@/features/tasks/schema'
import type { Client, Task } from '@/types/database'

interface TaskFormDrawerProps {
  open: boolean
  mode: 'create' | 'edit'
  task?: Task | null
  isLoadingTask?: boolean
  submitting: boolean
  errorMessage: string | null
  clients: Pick<Client, 'id' | 'first_name' | 'last_name' | 'company'>[]
  /** Optional pre-selected client (used when opening from /clients/:id) */
  preselectedClientId?: string | null
  onClose: () => void
  onSubmit: (values: TaskFormOutput) => Promise<void>
  /** Only available in edit mode */
  onDelete?: () => void
}

function toFormValues(t: Task): TaskFormValues {
  return {
    title: t.title,
    notes: t.notes ?? '',
    due_date: t.due_date ?? '',
    priority: t.priority,
    client_id: t.client_id,
    assignee: t.assignee,
  }
}

export function TaskFormDrawer({
  open,
  mode,
  task,
  isLoadingTask,
  submitting,
  errorMessage,
  clients,
  preselectedClientId,
  onClose,
  onSubmit,
  onDelete,
}: TaskFormDrawerProps) {
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [isClientTask, setIsClientTask] = useState(false)

  const form = useForm<TaskFormValues, undefined, TaskFormOutput>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: emptyTaskForm,
    mode: 'onBlur',
  })
  const { register, handleSubmit, reset, formState, setValue, watch } = form
  const { errors, isDirty } = formState

  const clientId = watch('client_id')
  const priority = watch('priority')
  const assignee = watch('assignee')

  // Reset form when opening or when task data arrives
  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && task) {
      reset(toFormValues(task))
      setIsClientTask(task.client_id !== null)
    } else if (mode === 'create') {
      if (preselectedClientId) {
        reset({ ...emptyTaskForm, client_id: preselectedClientId })
        setIsClientTask(true)
      } else {
        reset(emptyTaskForm)
        setIsClientTask(false)
      }
    }
  }, [open, mode, task, preselectedClientId, reset])

  function setClientMode(linked: boolean) {
    setIsClientTask(linked)
    if (!linked) {
      setValue('client_id', null, { shouldDirty: true })
      setValue('assignee', 'owner', { shouldDirty: true })
    }
  }

  function tryClose() {
    if (isDirty && !submitting) {
      setConfirmDiscard(true)
    } else {
      onClose()
    }
  }

  async function onValid(values: TaskFormOutput) {
    if (isClientTask && values.client_id === null) {
      form.setError('client_id', {
        type: 'manual',
        message: 'Choisissez un client pour cette tâche',
      })
      return
    }
    await onSubmit(values)
  }

  const title = mode === 'create' ? 'Nouvelle tâche' : 'Modifier la tâche'

  const clientOptions: ComboboxOption[] = clients.map((c) => ({
    value: c.id,
    label: `${c.first_name} ${c.last_name}`,
    meta: c.company ?? undefined,
  }))

  const footer = (
    <div className="flex items-center justify-between gap-2">
      {mode === 'edit' && onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          disabled={submitting}
          className="inline-flex items-center gap-1 text-sm text-danger hover:text-danger/80 disabled:opacity-50 transition"
        >
          <Trash2 className="h-4 w-4" />
          Supprimer
        </button>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" onClick={tryClose} disabled={submitting}>
          Annuler
        </Button>
        <Button
          type="submit"
          form="task-form"
          disabled={submitting || (mode === 'edit' && isLoadingTask)}
        >
          {submitting ? <Spinner size="sm" /> : 'Enregistrer'}
        </Button>
      </div>
    </div>
  )

  return (
    <>
      <Drawer open={open} onClose={tryClose} title={title} footer={footer}>
        {mode === 'edit' && isLoadingTask ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" className="text-accent" />
          </div>
        ) : (
          <form
            id="task-form"
            onSubmit={handleSubmit(onValid)}
            className="space-y-6"
            noValidate
          >
            {errorMessage && (
              <div className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">
                {errorMessage}
              </div>
            )}

            <Section title="">
              <FieldWrapper label="Titre *" error={errors.title?.message}>
                <Input {...register('title')} autoComplete="off" placeholder="Que dois-tu faire ?" />
              </FieldWrapper>
            </Section>

            <Section title="Client">
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="task-type"
                    checked={!isClientTask}
                    onChange={() => setClientMode(false)}
                    className="accent-accent"
                  />
                  <span className="text-sm text-text">Tâche perso</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="task-type"
                    checked={isClientTask}
                    onChange={() => setClientMode(true)}
                    className="accent-accent"
                  />
                  <span className="text-sm text-text">Liée à un client</span>
                </label>
              </div>

              {isClientTask && (
                <div className="mt-3 space-y-3 pl-6 border-l-2 border-accent-soft">
                  <FieldWrapper label="Client *" error={errors.client_id?.message}>
                    <Combobox
                      options={clientOptions}
                      value={clientId}
                      onChange={(v) => {
                        setValue('client_id', v, { shouldDirty: true, shouldValidate: true })
                        form.clearErrors('client_id')
                      }}
                      placeholder="Sélectionner un client…"
                      emptyMessage="Aucun client"
                    />
                  </FieldWrapper>

                  <div>
                    <Label className="mb-1.5 block">À faire par</Label>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="assignee"
                          checked={assignee === 'owner'}
                          onChange={() => setValue('assignee', 'owner', { shouldDirty: true })}
                          className="accent-accent"
                        />
                        <span className="text-sm text-text">Moi</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="assignee"
                          checked={assignee === 'client'}
                          onChange={() => setValue('assignee', 'client', { shouldDirty: true })}
                          className="accent-accent"
                        />
                        <span className="text-sm text-text">
                          Le client
                          <span className="text-muted"> · visible dans son portail</span>
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </Section>

            <Section title="Priorité">
              <div className="flex items-center gap-4">
                {(['low', 'normal', 'high'] as const).map((p) => (
                  <label key={p} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      checked={priority === p}
                      onChange={() => setValue('priority', p, { shouldDirty: true })}
                      className="accent-accent"
                    />
                    <span className="text-sm text-text capitalize">
                      {p === 'low' ? 'Basse' : p === 'normal' ? 'Normale' : 'Haute'}
                    </span>
                  </label>
                ))}
              </div>
            </Section>

            <Section title="Date d'échéance">
              <FieldWrapper label="" error={errors.due_date?.message}>
                <Input type="date" {...register('due_date')} />
              </FieldWrapper>
            </Section>

            <Section title="Notes">
              <FieldWrapper label="" error={errors.notes?.message}>
                <textarea
                  {...register('notes')}
                  rows={4}
                  className={cn(
                    'w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted',
                    'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20',
                    'disabled:opacity-50 disabled:pointer-events-none'
                  )}
                  placeholder="Notes optionnelles…"
                />
              </FieldWrapper>
            </Section>
          </form>
        )}
      </Drawer>

      <ConfirmDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false)
          onClose()
        }}
        title="Abandonner les modifications ?"
        description="Les changements non enregistrés seront perdus."
        confirmLabel="Abandonner"
        confirmVariant="danger"
      />
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      {title && (
        <h3 className="text-xs font-semibold tracking-wider text-muted uppercase mb-3">
          {title}
        </h3>
      )}
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function FieldWrapper({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      {label && <Label className="mb-1.5 block">{label}</Label>}
      {children}
      {error && <div className="text-xs text-danger mt-1">{error}</div>}
    </div>
  )
}
