import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft } from 'lucide-react'
import { InvoiceForm } from './components/InvoiceForm'
import { useCanCreateInvoice, useCompanySettings } from '@/features/settings/hooks'
import { useCreateInvoice } from '@/features/invoices/hooks'
import { computeDueDate } from '@/features/invoices/schema'
import { calculateLineTotal, calculateInvoiceTotal } from '@/features/invoices/totals'
import type { InvoiceFormOutput } from '@/features/invoices/schema'

// Maps Supabase / Postgres errors raised by createInvoice into a French message
// the operator can act on. Falls back to the raw message for anything else so
// debugging stays possible (the raw error is also console.error'd by the caller).
function friendlyCreateError(err: unknown, invoiceNumber: string | null | undefined): string {
  if (err && typeof err === 'object') {
    const code = (err as { code?: unknown }).code
    const rawMessage =
      'message' in err ? String((err as { message: unknown }).message) : ''

    // Postgres unique_violation (23505) on invoices.invoice_number — the only
    // unique constraint on that table that's reachable from the create flow.
    if (
      code === '23505' &&
      (rawMessage.includes('invoices_invoice_number_key') ||
        rawMessage.includes('invoice_number'))
    ) {
      return invoiceNumber
        ? `Le numéro ${invoiceNumber} est déjà utilisé. Choisis-en un autre, ou laisse le champ vide pour incrémenter automatiquement.`
        : 'Ce numéro de facture est déjà utilisé. Choisis-en un autre, ou laisse le champ vide pour incrémenter automatiquement.'
    }

    if (rawMessage) return rawMessage
  }
  if (err instanceof Error) return err.message
  return 'Une erreur est survenue.'
}

export function InvoiceCreatePage() {
  const navigate = useNavigate()
  const { canCreate, missingFields, isLoading: canLoading } = useCanCreateInvoice()
  const { data: settings } = useCompanySettings()
  const createMutation = useCreateInvoice()
  const [submitError, setSubmitError] = useState<string | null>(null)

  if (canLoading) {
    return null
  }

  if (!canCreate) {
    return (
      <Card className="max-w-lg mx-auto text-center">
        <h2 className="text-lg font-semibold text-text mb-2">Configuration incomplète</h2>
        <p className="text-sm text-muted mb-4">
          Renseigne d'abord ton entreprise dans Paramètres avant de créer une facture.
          Champs manquants : {missingFields.join(', ')}.
        </p>
        <Button onClick={() => navigate('/settings')}>Aller aux Paramètres</Button>
      </Card>
    )
  }

  async function handleSubmit(values: InvoiceFormOutput) {
    setSubmitError(null)
    if (!settings) return
    try {
      const dueDate = computeDueDate(values)
      const linesWithTotals = values.lines.map((l, i) => ({
        position: i,
        reference: l.reference,
        description: l.description,
        unit_price_ht: l.unit_price_ht,
        quantity: l.quantity,
        total_ht: calculateLineTotal(l.unit_price_ht, l.quantity),
      }))
      const totalHt = calculateInvoiceTotal(values.lines)
      const newInvoice = await createMutation.mutateAsync({
        input: {
          client_id: values.client_id,
          invoice_number: values.invoice_number,
          invoice_date: values.invoice_date,
          due_date: dueDate,
          payment_method: values.payment_method,
          status: 'pending',
          total_ht: totalHt,
          vat_mention: settings.vat_mention,
        },
        lines: linesWithTotals,
        importedPdf: values.imported_pdf_file ?? null,
      })
      navigate(`/invoices/${newInvoice.id}`)
    } catch (err) {
      // Supabase PostgrestError / StorageError are plain objects with a
      // `message` property — they're not Error instances, so the previous
      // `instanceof Error` check fell through to the generic fallback and
      // hid the actual cause. Log the raw object for inspection too.
      console.error('[invoices] create failed', err)
      setSubmitError(friendlyCreateError(err, values.invoice_number))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/invoices')}
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-text transition"
        >
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>
        <h1 className="text-lg font-semibold text-text">Nouvelle facture</h1>
        <div />
      </div>

      <InvoiceForm
        mode="create"
        submitting={createMutation.isPending}
        errorMessage={submitError}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/invoices')}
      />
    </div>
  )
}

export default InvoiceCreatePage
