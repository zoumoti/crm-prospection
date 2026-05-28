import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Spinner } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FileUploadZone } from '@/components/ui/FileUploadZone'
import { ClientPicker } from './ClientPicker'
import { cn } from '@/lib/utils'
import {
  contractFormSchema,
  emptyContractForm,
  type ContractFormValues,
  type ContractFormOutput,
  ACCEPTED_MIMES,
  MAX_SIZE_BYTES,
} from '@/features/contracts/schema'
import type { Contract } from '@/types/database'

interface ContractFormDrawerProps {
  open: boolean
  mode: 'create' | 'edit'
  contract?: Contract | null
  isLoadingContract?: boolean
  submitting: boolean
  errorMessage: string | null
  defaultClientId?: string  // pour pré-sélection via ?client=:id
  onClose: () => void
  onSubmit: (values: ContractFormOutput) => Promise<void>
}

function toFormValues(c: Contract): ContractFormValues {
  return {
    client_id: c.client_id,
    name: c.name,
    signed_at: c.signed_at,
    notes: c.notes ?? '',
    file: undefined,
  }
}

export function ContractFormDrawer({
  open,
  mode,
  contract,
  isLoadingContract,
  submitting,
  errorMessage,
  defaultClientId,
  onClose,
  onSubmit,
}: ContractFormDrawerProps) {
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const form = useForm<ContractFormValues, undefined, ContractFormOutput>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: emptyContractForm,
    mode: 'onBlur',
  })
  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    setValue,
    watch,
    formState,
  } = form
  const { errors, isDirty } = formState
  const fileValue = watch('file')

  // Reset form on open or when contract data arrives
  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && contract) {
      reset(toFormValues(contract))
    } else if (mode === 'create') {
      reset({
        ...emptyContractForm,
        client_id: defaultClientId ?? '',
      })
    }
  }, [open, mode, contract, defaultClientId, reset])

  function tryClose() {
    if ((isDirty || fileValue) && !submitting) {
      setConfirmDiscard(true)
    } else {
      onClose()
    }
  }

  async function onValid(values: ContractFormOutput) {
    if (mode === 'create' && !values.file) {
      setError('file', { type: 'manual', message: 'Fichier requis' })
      return
    }
    await onSubmit(values)
  }

  const title = mode === 'create' ? 'Nouveau contrat' : 'Modifier le contrat'

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button type="button" variant="ghost" onClick={tryClose} disabled={submitting}>
        Annuler
      </Button>
      <Button
        type="submit"
        form="contract-form"
        disabled={submitting || (mode === 'edit' && isLoadingContract)}
      >
        {submitting ? <Spinner size="sm" /> : 'Enregistrer'}
      </Button>
    </div>
  )

  const currentFile = mode === 'edit' && contract
    ? { name: contract.file_name, size: contract.file_size }
    : null

  return (
    <>
      <Drawer open={open} onClose={tryClose} title={title} footer={footer}>
        {mode === 'edit' && isLoadingContract ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" className="text-accent" />
          </div>
        ) : (
          <form
            id="contract-form"
            onSubmit={handleSubmit(onValid)}
            className="space-y-6"
            noValidate
          >
            {errorMessage && (
              <div className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">
                {errorMessage}
              </div>
            )}

            {submitting && (
              <div className="text-sm text-muted bg-bg rounded-lg px-3 py-2 flex items-center gap-2">
                <Spinner size="sm" className="text-accent" />
                Upload du fichier en cours…
              </div>
            )}

            <Section title="Informations">
              <FieldWrapper label="Client *" error={errors.client_id?.message}>
                <Controller
                  control={control}
                  name="client_id"
                  render={({ field }) => (
                    <ClientPicker
                      value={field.value || null}
                      onChange={(v) => field.onChange(v ?? '')}
                      disabled={submitting}
                    />
                  )}
                />
              </FieldWrapper>
              <FieldWrapper label="Nom du contrat *" error={errors.name?.message}>
                <Input {...register('name')} autoComplete="off" placeholder="ex. Contrat de prestation 2026" />
              </FieldWrapper>
              <FieldWrapper label="Date de signature *" error={errors.signed_at?.message}>
                <Input type="date" {...register('signed_at')} />
              </FieldWrapper>
            </Section>

            <Section title="Fichier">
              <Controller
                control={control}
                name="file"
                render={({ field }) => (
                  <FileUploadZone
                    value={field.value ?? null}
                    onChange={(f) => {
                      if (f) setValue('file', f, { shouldDirty: true, shouldValidate: true })
                      else setValue('file', undefined, { shouldDirty: true })
                    }}
                    currentFile={currentFile}
                    error={errors.file?.message as string | undefined}
                    disabled={submitting}
                    acceptedMimes={ACCEPTED_MIMES}
                    maxSizeBytes={MAX_SIZE_BYTES}
                    acceptAttr=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    helpText="PDF, DOC, DOCX · 10 Mo max"
                    tooLargeMessage="Fichier trop volumineux (max 10 Mo)"
                    unsupportedMessage="Format non supporté (PDF, DOC, DOCX uniquement)"
                  />
                )}
              />
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
                  disabled={submitting}
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
