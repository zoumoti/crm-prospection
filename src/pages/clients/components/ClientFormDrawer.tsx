import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, X } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Spinner } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { cn } from '@/lib/utils'
import {
  clientFormSchema,
  emptyClientForm,
  emptyPortalLink,
  type ClientFormValues,
  type ClientFormOutput,
} from '@/features/clients/schema'
import {
  normalizeInstagram,
  normalizeLinkedIn,
  normalizeTikTok,
} from '@/features/clients/normalize'
import type { Client } from '@/types/database'

export interface ClientPrefill {
  first_name: string
  last_name: string
  company: string | null
  email: string | null
  phone: string | null
  instagram: string | null
  linkedin: string | null
  tiktok: string | null
}

interface ClientFormDrawerProps {
  open: boolean
  mode: 'create' | 'edit'
  client?: Client | null
  isLoadingClient?: boolean
  submitting: boolean
  errorMessage: string | null
  onClose: () => void
  onSubmit: (values: ClientFormOutput) => Promise<void>
}

function toFormValues(c: Client): ClientFormValues {
  return {
    first_name: c.first_name,
    last_name: c.last_name,
    company: c.company ?? '',
    siret: c.siret ?? '',
    address: c.address ?? '',
    email: c.email ?? '',
    phone: c.phone ?? '',
    instagram: c.instagram ?? '',
    linkedin: c.linkedin ?? '',
    tiktok: c.tiktok ?? '',
    notes: c.notes ?? '',
    start_date: c.start_date ?? '',
    portal_links: c.portal_links ?? [],
  }
}

export function ClientFormDrawer({
  open,
  mode,
  client,
  isLoadingClient,
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}: ClientFormDrawerProps) {
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const form = useForm<ClientFormValues, undefined, ClientFormOutput>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: emptyClientForm,
    mode: 'onBlur',
  })
  const { register, handleSubmit, reset, control, formState } = form
  const { errors, isDirty } = formState

  const {
    fields: portalLinkFields,
    append: appendPortalLink,
    remove: removePortalLink,
  } = useFieldArray({ control, name: 'portal_links' })

  const location = useLocation()

  // Reset form when opening or when client data arrives
  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && client) {
      reset(toFormValues(client))
      return
    }
    if (mode === 'create') {
      const prefill = (location.state as { prefillFromContact?: ClientPrefill } | null)?.prefillFromContact
      if (prefill) {
        reset({
          ...emptyClientForm,
          first_name: prefill.first_name,
          last_name: prefill.last_name,
          company: prefill.company ?? '',
          email: prefill.email ?? '',
          phone: prefill.phone ?? '',
          instagram: prefill.instagram ?? '',
          linkedin: prefill.linkedin ?? '',
          tiktok: prefill.tiktok ?? '',
        })
      } else {
        reset(emptyClientForm)
      }
    }
  }, [open, mode, client, location.state, reset])

  function tryClose() {
    if (isDirty && !submitting) {
      setConfirmDiscard(true)
    } else {
      onClose()
    }
  }

  async function onValid(values: ClientFormOutput) {
    const normalized: ClientFormOutput = {
      ...values,
      instagram: normalizeInstagram(values.instagram),
      linkedin: normalizeLinkedIn(values.linkedin),
      tiktok: normalizeTikTok(values.tiktok),
    }
    await onSubmit(normalized)
  }

  const title = mode === 'create' ? 'Nouveau client' : 'Modifier le client'

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button type="button" variant="ghost" onClick={tryClose} disabled={submitting}>
        Annuler
      </Button>
      <Button
        type="submit"
        form="client-form"
        disabled={submitting || (mode === 'edit' && isLoadingClient)}
      >
        {submitting ? <Spinner size="sm" /> : 'Enregistrer'}
      </Button>
    </div>
  )

  return (
    <>
      <Drawer open={open} onClose={tryClose} title={title} footer={footer}>
        {mode === 'edit' && isLoadingClient ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" className="text-accent" />
          </div>
        ) : (
          <form
            id="client-form"
            onSubmit={handleSubmit(onValid)}
            className="space-y-6"
            noValidate
          >
            {errorMessage && (
              <div className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">
                {errorMessage}
              </div>
            )}

            <Section title="Identité">
              <div className="grid grid-cols-2 gap-3">
                <FieldWrapper label="Prénom *" error={errors.first_name?.message}>
                  <Input {...register('first_name')} autoComplete="off" />
                </FieldWrapper>
                <FieldWrapper label="Nom *" error={errors.last_name?.message}>
                  <Input {...register('last_name')} autoComplete="off" />
                </FieldWrapper>
              </div>
              <FieldWrapper label="Entreprise" error={errors.company?.message}>
                <Input {...register('company')} autoComplete="off" />
              </FieldWrapper>
            </Section>

            <Section title="Coordonnées">
              <FieldWrapper label="Email" error={errors.email?.message}>
                <Input type="email" {...register('email')} autoComplete="off" />
              </FieldWrapper>
              <FieldWrapper label="Téléphone" error={errors.phone?.message}>
                <Input {...register('phone')} autoComplete="off" />
              </FieldWrapper>
              <FieldWrapper label="Adresse" error={errors.address?.message}>
                <Input {...register('address')} autoComplete="off" />
              </FieldWrapper>
            </Section>

            <Section title="Réseaux sociaux">
              <FieldWrapper label="Instagram" error={errors.instagram?.message}>
                <Input {...register('instagram')} placeholder="@username ou URL" />
              </FieldWrapper>
              <FieldWrapper label="LinkedIn" error={errors.linkedin?.message}>
                <Input {...register('linkedin')} placeholder="username ou URL" />
              </FieldWrapper>
              <FieldWrapper label="TikTok" error={errors.tiktok?.message}>
                <Input {...register('tiktok')} placeholder="@username ou URL" />
              </FieldWrapper>
            </Section>

            <Section title="Détails business">
              <div className="grid grid-cols-2 gap-3">
                <FieldWrapper label="SIRET" error={errors.siret?.message}>
                  <Input {...register('siret')} inputMode="numeric" />
                </FieldWrapper>
                <FieldWrapper label="Date de début" error={errors.start_date?.message}>
                  <Input type="date" {...register('start_date')} />
                </FieldWrapper>
              </div>
            </Section>

            <Section title="Applications">
              {portalLinkFields.length > 0 && (
                <div className="space-y-2">
                  {portalLinkFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="rounded-xl border border-border bg-bg/40 p-3 space-y-2"
                    >
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <div>
                          <Label className="mb-1 block text-xs">Label</Label>
                          <Input
                            {...register(`portal_links.${index}.label`)}
                            placeholder="Espace tâches"
                            autoComplete="off"
                          />
                          {errors.portal_links?.[index]?.label && (
                            <div className="text-xs text-danger mt-1">
                              {errors.portal_links[index]?.label?.message}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removePortalLink(index)}
                          aria-label="Retirer cette application"
                          className="h-11 w-11 self-end rounded-xl flex items-center justify-center text-muted hover:bg-bg transition"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs">URL</Label>
                        <Input
                          {...register(`portal_links.${index}.url`)}
                          type="url"
                          placeholder="https://app-hugo.vercel.app"
                          autoComplete="off"
                        />
                        {errors.portal_links?.[index]?.url && (
                          <div className="text-xs text-danger mt-1">
                            {errors.portal_links[index]?.url?.message}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => appendPortalLink(emptyPortalLink())}
              >
                <Plus className="h-4 w-4" /> Ajouter une application
              </Button>
              {portalLinkFields.length === 0 && (
                <p className="text-xs text-muted">
                  Aucune application assignée. Ajoute une URL si ce client a un portail déployé.
                </p>
              )}
            </Section>

            <Section title="Notes">
              <FieldWrapper label="" error={errors.notes?.message}>
                <textarea
                  {...register('notes')}
                  aria-label="Notes"
                  rows={4}
                  className={cn(
                    'w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted',
                    'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20',
                    'disabled:opacity-50 disabled:pointer-events-none'
                  )}
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
