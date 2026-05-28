import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Spinner } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { cn } from '@/lib/utils'
import {
  contactFormSchema,
  emptyContactForm,
  type ContactFormValues,
  type ContactFormOutput,
} from '@/features/crm/schema'
import { STAGES, SOURCE_LABELS } from '@/features/crm/stages'
import type { Contact } from '@/types/database'

interface ContactDrawerProps {
  open: boolean
  mode: 'create' | 'edit'
  contact?: Contact | null
  isLoadingContact?: boolean
  submitting: boolean
  errorMessage: string | null
  /** When mode='create', the URL ?stage= can preset this. */
  defaultStage?: ContactFormValues['stage']
  onClose: () => void
  onSubmit: (values: ContactFormOutput) => Promise<void>
}

function toFormValues(c: Contact): ContactFormValues {
  return {
    first_name: c.first_name,
    last_name: c.last_name,
    company: c.company ?? '',
    job_title: c.job_title ?? '',
    email: c.email ?? '',
    phone: c.phone ?? '',
    source: c.source ?? '',
    source_url: c.source_url ?? '',
    niche: c.niche ?? '',
    stage: c.stage,
    loom_url: c.loom_url ?? '',
  }
}

export function ContactDrawer({
  open, mode, contact, isLoadingContact,
  submitting, errorMessage, defaultStage,
  onClose, onSubmit,
}: ContactDrawerProps) {
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const form = useForm<ContactFormValues, undefined, ContactFormOutput>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: emptyContactForm,
    mode: 'onBlur',
  })
  const { register, handleSubmit, reset, formState } = form
  const { errors, isDirty } = formState

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && contact) {
      reset(toFormValues(contact))
    } else if (mode === 'create') {
      reset({ ...emptyContactForm, stage: defaultStage ?? 'to_contact' })
    }
  }, [open, mode, contact, defaultStage, reset])

  function tryClose() {
    if (isDirty && !submitting) setConfirmDiscard(true)
    else onClose()
  }

  async function onValid(values: ContactFormOutput) {
    await onSubmit(values)
  }

  const title = mode === 'create' ? 'Nouveau prospect' : 'Modifier le prospect'

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button type="button" variant="ghost" onClick={tryClose} disabled={submitting}>Annuler</Button>
      <Button
        type="submit" form="contact-form"
        disabled={submitting || (mode === 'edit' && isLoadingContact)}
      >
        {submitting ? <Spinner size="sm" /> : 'Enregistrer'}
      </Button>
    </div>
  )

  return (
    <>
      <Drawer open={open} onClose={tryClose} title={title} footer={footer}>
        {mode === 'edit' && isLoadingContact ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" className="text-accent" />
          </div>
        ) : (
          <form id="contact-form" onSubmit={handleSubmit(onValid)} className="space-y-6" noValidate>
            {errorMessage && (
              <div className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2" role="alert">
                {errorMessage}
              </div>
            )}

            <Section title="Identité">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FieldWrapper label="Prénom *" error={errors.first_name?.message}>
                  <Input {...register('first_name')} autoComplete="off" />
                </FieldWrapper>
                <FieldWrapper label="Nom *" error={errors.last_name?.message}>
                  <Input {...register('last_name')} autoComplete="off" />
                </FieldWrapper>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FieldWrapper label="Entreprise" error={errors.company?.message}>
                  <Input {...register('company')} autoComplete="off" />
                </FieldWrapper>
                <FieldWrapper label="Poste" error={errors.job_title?.message}>
                  <Input {...register('job_title')} autoComplete="off" />
                </FieldWrapper>
              </div>
            </Section>

            <Section title="Coordonnées">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FieldWrapper label="Email" error={errors.email?.message}>
                  <Input type="email" {...register('email')} autoComplete="off" />
                </FieldWrapper>
                <FieldWrapper label="Téléphone" error={errors.phone?.message}>
                  <Input {...register('phone')} autoComplete="off" />
                </FieldWrapper>
              </div>
            </Section>

            <Section title="Source">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FieldWrapper label="Source" error={errors.source?.message}>
                  <select
                    {...register('source')}
                    className={cn(
                      'w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text',
                      'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20',
                    )}
                  >
                    <option value="">— Aucune —</option>
                    {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </FieldWrapper>
                <FieldWrapper label="Niche" error={errors.niche?.message}>
                  <Input {...register('niche')} placeholder="ex: SaaS, coaching…" />
                </FieldWrapper>
              </div>
              <FieldWrapper label="URL source" error={errors.source_url?.message}>
                <Input {...register('source_url')} placeholder="https://…" />
              </FieldWrapper>
            </Section>

            <Section title="Pipeline">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FieldWrapper label="Stage" error={errors.stage?.message}>
                  <select
                    {...register('stage')}
                    className={cn(
                      'w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text',
                      'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20',
                    )}
                  >
                    {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </FieldWrapper>
                <FieldWrapper label="Lien Loom" error={errors.loom_url?.message}>
                  <Input {...register('loom_url')} placeholder="https://loom.com/…" />
                </FieldWrapper>
              </div>
            </Section>
          </form>
        )}
      </Drawer>

      <ConfirmDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => { setConfirmDiscard(false); onClose() }}
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
      <h3 className="text-xs font-semibold tracking-wider text-muted uppercase mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function FieldWrapper({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      {label && <Label className="mb-1.5 block">{label}</Label>}
      {children}
      {error && <div className="text-xs text-danger mt-1">{error}</div>}
    </div>
  )
}
