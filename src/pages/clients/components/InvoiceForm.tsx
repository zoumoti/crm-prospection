import { useEffect, useMemo, useRef, useState } from 'react'
import { FormProvider, useForm, useFieldArray, useWatch, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { FileUploadZone } from '@/components/ui/FileUploadZone'
import { ClientPicker } from './ClientPicker'
import { InvoiceLineRow } from './InvoiceLineRow'
import { InvoicePreviewPanel } from './InvoicePreviewPanel'
import { ImportedPdfPreview } from './ImportedPdfPreview'
import {
  invoiceFormSchema,
  emptyLine,
  emptyInvoiceForm,
  todayIso,
  IMPORTED_PDF_MAX_BYTES,
  type InvoiceFormValues,
  type InvoiceFormOutput,
} from '@/features/invoices/schema'
import { calculateInvoiceTotal, formatCurrency } from '@/features/invoices/totals'

interface InvoiceFormProps {
  mode: 'create' | 'edit'
  initialValues?: InvoiceFormValues
  invoiceNumberPreview?: string
  submitting: boolean
  errorMessage: string | null
  onSubmit: (values: InvoiceFormOutput) => Promise<void>
  onCancel: () => void
}

function parsePrice(v: string): number {
  const n = Number(v.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function InvoiceForm({
  mode,
  initialValues,
  invoiceNumberPreview,
  submitting,
  errorMessage,
  onSubmit,
  onCancel,
}: InvoiceFormProps) {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')

  const form = useForm<InvoiceFormValues, undefined, InvoiceFormOutput>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: initialValues ?? emptyInvoiceForm(todayIso()),
    mode: 'onBlur',
  })

  const { register, handleSubmit, control, formState, setValue } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  // Guard against fast double-submit: the React Query `submitting` flag has a
  // microtask of latency before the button's `disabled` re-render, so a 2nd
  // click within that window can fire a duplicate mutation. The ref blocks it
  // synchronously.
  const submittingRef = useRef(false)
  async function guardedSubmit(values: InvoiceFormOutput) {
    if (submittingRef.current) return
    submittingRef.current = true
    try {
      await onSubmit(values)
    } finally {
      submittingRef.current = false
    }
  }

  const watched = useWatch({ control })
  const [debounced, setDebounced] = useState<InvoiceFormOutput | null>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      const result = invoiceFormSchema.safeParse(watched)
      if (result.success) {
        setDebounced(result.data)
      } else {
        setDebounced(null)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [watched])

  const clientId = useWatch({ control, name: 'client_id' })
  const dueMode = useWatch({ control, name: 'due_mode' })
  const linesWatched = useWatch({ control, name: 'lines' })
  const importedFile = useWatch({ control, name: 'imported_pdf_file' }) as File | undefined

  const total = useMemo(() => {
    const lines = linesWatched ?? []
    return calculateInvoiceTotal(
      lines.map((l) => ({
        unit_price_ht: parsePrice(l.unit_price_ht ?? ''),
        quantity: parsePrice(l.quantity ?? ''),
      }))
    )
  }, [linesWatched])

  const FormPanel = (
    <form
      id="invoice-form"
      onSubmit={handleSubmit(guardedSubmit)}
      className="space-y-4"
      noValidate
    >
      {errorMessage && (
        <div className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">{errorMessage}</div>
      )}

      <Card>
        <div className="space-y-3">
          <div>
            <Label className="mb-1.5 block">Client *</Label>
            <ClientPicker
              value={clientId || null}
              onChange={(v) => setValue('client_id', v ?? '', { shouldDirty: true, shouldValidate: true })}
            />
            {formState.errors.client_id && (
              <div className="text-xs text-danger mt-1">{formState.errors.client_id.message}</div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Date de la facture *</Label>
              <Input type="date" {...register('invoice_date')} />
              {formState.errors.invoice_date && (
                <div className="text-xs text-danger mt-1">{formState.errors.invoice_date.message}</div>
              )}
            </div>
            <div>
              <Label className="mb-1.5 block">Échéance</Label>
              <select
                {...register('due_mode')}
                aria-label="Échéance"
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              >
                <option value="on_receipt">À réception</option>
                <option value="30_days">30 jours</option>
                <option value="custom">Date personnalisée</option>
              </select>
            </div>
          </div>
          {mode === 'create' && (
            <div>
              <Label className="mb-1.5 block">Numéro de facture</Label>
              <Input
                {...register('invoice_number')}
                placeholder="Auto — laisser vide pour incrémenter (F00001, F00002…)"
              />
              <p className="text-xs text-muted mt-1">
                Optionnel. Saisir un numéro (ex: F00018) si tu rattrapes un historique existant.
                Les factures suivantes incrémenteront à partir de ce numéro.
              </p>
              {formState.errors.invoice_number && (
                <div className="text-xs text-danger mt-1">{formState.errors.invoice_number.message}</div>
              )}
            </div>
          )}
          {mode === 'create' && (
            <div>
              <Label className="mb-1.5 block">Importer un PDF existant (optionnel)</Label>
              <Controller
                control={control}
                name="imported_pdf_file"
                render={({ field }) => (
                  <FileUploadZone
                    value={field.value ?? null}
                    onChange={(f) =>
                      setValue('imported_pdf_file', f ?? undefined, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    error={formState.errors.imported_pdf_file?.message as string | undefined}
                    disabled={submitting}
                    acceptedMimes={['application/pdf']}
                    maxSizeBytes={IMPORTED_PDF_MAX_BYTES}
                    acceptAttr=".pdf,application/pdf"
                    helpText="PDF uniquement · 10 Mo max"
                    tooLargeMessage="PDF trop volumineux (max 10 Mo)"
                    unsupportedMessage="Seul le format PDF est accepté"
                  />
                )}
              />
              <p className="text-xs text-muted mt-1">
                Pour rattraper d'anciennes factures : le PDF importé devient l'aperçu et la version
                téléchargeable. Les lignes restent obligatoires pour les revenus et statistiques.
              </p>
            </div>
          )}
          {dueMode === 'custom' && (
            <div>
              <Label className="mb-1.5 block">Date d'échéance custom</Label>
              <Input type="date" {...register('due_date_custom')} />
            </div>
          )}
          <div>
            <Label className="mb-1.5 block">Mode de règlement *</Label>
            <Input {...register('payment_method')} />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-text">Lignes</h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => append(emptyLine())}
          >
            <Plus className="h-4 w-4" />
            Ajouter une ligne
          </Button>
        </div>
        <div className="space-y-3">
          {fields.map((field, index) => (
            <InvoiceLineRow
              key={field.id}
              index={index}
              onRemove={() => remove(index)}
              canRemove={fields.length > 1}
            />
          ))}
        </div>
        {formState.errors.lines?.root && (
          <div className="text-xs text-danger mt-2">{formState.errors.lines.root.message}</div>
        )}
        <div className="flex items-center justify-end mt-4 pt-3 border-t border-border">
          <div className="text-right">
            <div className="text-xs text-muted">Total HT</div>
            <div className="text-lg font-semibold text-text">{formatCurrency(total)}</div>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Annuler
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Spinner size="sm" /> : mode === 'create' ? 'Créer la facture' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  )

  const PreviewPanel = (
    <div className="h-[calc(100vh-12rem)] bg-bg rounded-2xl overflow-hidden border border-border/40">
      {importedFile instanceof File ? (
        <ImportedPdfPreview file={importedFile} />
      ) : (
        <InvoicePreviewPanel formOutput={debounced} previewInvoiceNumber={invoiceNumberPreview} />
      )}
    </div>
  )

  return (
    <FormProvider {...form}>
      {/* Tabs nav — mobile/tablet only */}
      <div className="lg:hidden flex gap-1 mb-4 bg-bg rounded-xl p-1">
        <button
          type="button"
          onClick={() => setActiveTab('edit')}
          className={
            activeTab === 'edit'
              ? 'flex-1 py-2 rounded-lg bg-surface text-text text-sm font-medium shadow-sm'
              : 'flex-1 py-2 rounded-lg text-muted text-sm font-medium'
          }
        >
          Édition
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={
            activeTab === 'preview'
              ? 'flex-1 py-2 rounded-lg bg-surface text-text text-sm font-medium shadow-sm'
              : 'flex-1 py-2 rounded-lg text-muted text-sm font-medium'
          }
        >
          Aperçu
        </button>
      </div>

      {/* Panels — each rendered exactly ONCE in the DOM.
          Mobile/tablet: hidden via class when not active tab.
          Desktop (lg+): both visible side by side. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={activeTab === 'edit' ? '' : 'hidden lg:block'}>
          {FormPanel}
        </div>
        <div className={activeTab === 'preview' ? '' : 'hidden lg:block'}>
          {PreviewPanel}
        </div>
      </div>
    </FormProvider>
  )
}
