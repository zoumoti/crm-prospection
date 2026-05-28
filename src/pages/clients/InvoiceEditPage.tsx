import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'
import { InvoiceForm } from './components/InvoiceForm'
import { useInvoice, useUpdateInvoice } from '@/features/invoices/hooks'
import { useCompanySettings } from '@/features/settings/hooks'
import {
  type InvoiceFormOutput,
  type InvoiceFormValues,
  computeDueDate,
} from '@/features/invoices/schema'
import { calculateLineTotal, calculateInvoiceTotal } from '@/features/invoices/totals'
import type { InvoiceLine } from '@/types/database'

function linesToFormValues(lines: InvoiceLine[]): InvoiceFormValues['lines'] {
  return lines.map((l) => ({
    reference: l.reference ?? '',
    description: l.description,
    unit_price_ht: String(l.unit_price_ht).replace('.', ','),
    quantity: String(l.quantity).replace('.', ','),
  }))
}

export function InvoiceEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useInvoice(id)
  const { data: settings } = useCompanySettings()
  const updateMutation = useUpdateInvoice(id ?? '')
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (data && (data.invoice.status === 'paid' || data.invoice.imported_pdf_path)) {
      navigate(`/invoices/${data.invoice.id}`, { replace: true })
    }
  }, [data, navigate])

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" className="text-accent" />
      </div>
    )
  }

  if (isError) {
    return <Navigate to="/invoices" replace />
  }

  const { invoice, lines } = data

  if (invoice.status === 'paid' || invoice.imported_pdf_path) {
    return null
  }

  const initialValues: InvoiceFormValues = {
    client_id: invoice.client_id,
    invoice_number: '', // unused in edit mode (field hidden), invoice_number not editable post-creation
    invoice_date: invoice.invoice_date,
    due_mode: invoice.due_date === null ? 'on_receipt' : 'custom',
    due_date_custom: invoice.due_date ?? '',
    payment_method: invoice.payment_method,
    lines: linesToFormValues(lines),
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
      await updateMutation.mutateAsync({
        patch: {
          client_id: values.client_id,
          invoice_date: values.invoice_date,
          due_date: dueDate,
          payment_method: values.payment_method,
          total_ht: totalHt,
          vat_mention: settings.vat_mention,
        },
        lines: linesWithTotals,
      })
      navigate(`/invoices/${invoice.id}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/invoices/${invoice.id}`)}
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-text transition"
        >
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>
        <h1 className="text-lg font-semibold text-text">
          Modifier <span className="font-mono">{invoice.invoice_number}</span>
        </h1>
        <div />
      </div>

      <InvoiceForm
        mode="edit"
        initialValues={initialValues}
        invoiceNumberPreview={invoice.invoice_number}
        submitting={updateMutation.isPending}
        errorMessage={submitError}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/invoices/${invoice.id}`)}
      />
    </div>
  )
}

export default InvoiceEditPage
