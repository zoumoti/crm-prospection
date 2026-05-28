import { useEffect, useMemo, useState } from 'react'
import { PDFViewer } from '@react-pdf/renderer'
import { Spinner } from '@/components/ui/Spinner'
import { InvoicePdf } from '@/features/invoices/pdf/InvoicePdf'
import { fetchLogoAsBase64 } from '@/features/invoices/pdf/helpers'
import { useCompanySettings } from '@/features/settings/hooks'
import { useClients } from '@/features/clients/hooks'
import { calculateLineTotal, calculateInvoiceTotal } from '@/features/invoices/totals'
import { computeDueDate } from '@/features/invoices/schema'
import type { InvoiceFormOutput } from '@/features/invoices/schema'
import type { Invoice, InvoiceLine, Client } from '@/types/database'

interface InvoicePreviewPanelProps {
  formOutput: InvoiceFormOutput | null
  previewInvoiceNumber?: string
}

const PLACEHOLDER_INVOICE_NUMBER = 'FXXXXX'

export function InvoicePreviewPanel({
  formOutput,
  previewInvoiceNumber = PLACEHOLDER_INVOICE_NUMBER,
}: InvoicePreviewPanelProps) {
  const { data: settings } = useCompanySettings()
  const { data: clients = [] } = useClients()
  const [logoBase64, setLogoBase64] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchLogoAsBase64(settings?.logo_path ?? null).then((b64) => {
      if (!cancelled) setLogoBase64(b64)
    })
    return () => {
      cancelled = true
    }
  }, [settings?.logo_path])

  const built = useMemo(() => {
    if (!formOutput || !settings) return null
    const client = clients.find((c) => c.id === formOutput.client_id)
    if (!client) return null
    const lines: InvoiceLine[] = formOutput.lines.map((l, i) => ({
      id: `preview-${i}`,
      invoice_id: 'preview',
      position: i,
      reference: l.reference,
      description: l.description,
      unit_price_ht: l.unit_price_ht,
      quantity: l.quantity,
      total_ht: calculateLineTotal(l.unit_price_ht, l.quantity),
      created_at: new Date().toISOString(),
    }))
    const totalHt = calculateInvoiceTotal(lines)
    const dueDate = computeDueDate(formOutput)
    const invoice: Invoice = {
      id: 'preview',
      user_id: 'preview',
      client_id: client.id,
      invoice_number: previewInvoiceNumber,
      invoice_date: formOutput.invoice_date,
      due_date: dueDate,
      payment_method: formOutput.payment_method,
      status: 'pending',
      total_ht: totalHt,
      vat_mention: settings.vat_mention,
      paid_at: null,
      imported_pdf_path: null,
      archived_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    return { invoice, lines, client, settings }
  }, [formOutput, settings, clients, previewInvoiceNumber])

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" className="text-accent" />
      </div>
    )
  }

  if (!built) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted p-6 text-center">
        Sélectionne un client et remplis au moins une ligne pour voir l'aperçu PDF.
      </div>
    )
  }

  return (
    <PDFViewer width="100%" height="100%" showToolbar={false}>
      <InvoicePdf
        invoice={built.invoice}
        lines={built.lines as InvoiceLine[]}
        client={built.client as Client}
        settings={built.settings}
        logoBase64={logoBase64}
      />
    </PDFViewer>
  )
}
