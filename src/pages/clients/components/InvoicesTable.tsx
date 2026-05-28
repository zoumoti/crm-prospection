import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreHorizontal, Download, CheckCircle, RotateCcw, Archive } from 'lucide-react'
import { InvoiceStatusBadge } from './InvoiceStatusBadge'
import { formatCurrency, formatDateShort } from '@/features/invoices/totals'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  useMarkPaid,
  useMarkUnpaid,
  useArchiveInvoice,
} from '@/features/invoices/hooks'
import { MarkPaidModal } from '@/features/invoices/MarkPaidModal'
import { getInvoiceWithLines } from '@/features/invoices/api'
import { useCompanySettings } from '@/features/settings/hooks'
import type { Invoice } from '@/types/database'

interface RowMenuProps {
  invoice: Invoice
  onDownload: () => void
  onMarkPaid: () => void
  onMarkUnpaid: () => void
  onArchive: () => void
}

function RowMenu({ invoice, onDownload, onMarkPaid, onMarkUnpaid, onArchive }: RowMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])
  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Actions facture ${invoice.invoice_number}`}
        className="h-8 w-8 rounded-lg flex items-center justify-center text-muted hover:bg-bg transition cursor-pointer"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-56 rounded-xl bg-surface border border-border shadow-card p-2 z-30">
          <button
            onClick={() => { setOpen(false); onDownload() }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text hover:bg-bg transition"
          >
            <Download className="h-4 w-4" /> Télécharger PDF
          </button>
          {invoice.status === 'pending' ? (
            <button
              onClick={() => { setOpen(false); onMarkPaid() }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text hover:bg-bg transition"
            >
              <CheckCircle className="h-4 w-4" /> Marquer payée
            </button>
          ) : (
            <button
              onClick={() => { setOpen(false); onMarkUnpaid() }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text hover:bg-bg transition"
            >
              <RotateCcw className="h-4 w-4" /> Démarquer payée
            </button>
          )}
          <button
            onClick={() => { setOpen(false); onArchive() }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-danger hover:bg-danger/10 transition"
          >
            <Archive className="h-4 w-4" /> Archiver
          </button>
        </div>
      )}
    </div>
  )
}

interface InvoicesTableProps {
  invoices: Invoice[]
  clientLabel: (clientId: string) => string
}

export function InvoicesTable({ invoices, clientLabel }: InvoicesTableProps) {
  const navigate = useNavigate()
  const markPaid = useMarkPaid()
  const markUnpaid = useMarkUnpaid()
  const archive = useArchiveInvoice()
  const { data: settings } = useCompanySettings()

  const [paidModalInvoice, setPaidModalInvoice] = useState<Invoice | null>(null)
  const [confirmAction, setConfirmAction] = useState<
    | { type: 'unpaid' | 'archive'; invoice: Invoice }
    | null
  >(null)

  async function handleDownload(invoiceId: string) {
    if (!settings) return
    const { invoice, lines, client } = await getInvoiceWithLines(invoiceId)

    // Imported invoice: fetch the signed URL and trigger a blob download
    // (cross-origin `download` attr is otherwise ignored by the browser).
    if (invoice.imported_pdf_path) {
      const { getImportedPdfSignedUrl } = await import('@/features/invoices/api')
      const signedUrl = await getImportedPdfSignedUrl(invoice.imported_pdf_path)
      const response = await fetch(signedUrl)
      if (!response.ok) throw new Error('Téléchargement impossible')
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `${invoice.invoice_number}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(blobUrl)
      return
    }

    // Generated invoice: lazy-load @react-pdf and render on the fly.
    const { downloadInvoicePdf, fetchLogoAsBase64 } = await import('@/features/invoices/pdf/helpers')
    const logoBase64 = await fetchLogoAsBase64(settings.logo_path ?? null)
    await downloadInvoicePdf({ invoice, lines, client, settings, logoBase64 })
  }

  async function executeAction() {
    if (!confirmAction) return
    const { type, invoice } = confirmAction
    if (type === 'unpaid') await markUnpaid.mutateAsync(invoice.id)
    else if (type === 'archive') await archive.mutateAsync(invoice.id)
    setConfirmAction(null)
  }

  const actionLoading = markUnpaid.isPending || archive.isPending

  return (
    <>
      {/* Desktop */}
      {/* overflow-visible so the row actions dropdown isn't clipped by the rounded wrapper. */}
      <div className="hidden md:block rounded-2xl border border-border/40 bg-surface shadow-card">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs font-semibold tracking-wider text-muted uppercase border-b border-border">
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Numéro</th>
              <th className="px-5 py-3">Client</th>
              <th className="px-5 py-3 text-right">Montant HT</th>
              <th className="px-5 py-3">Statut</th>
              <th className="px-5 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr
                key={inv.id}
                onClick={() => navigate(`/invoices/${inv.id}`)}
                className="border-b border-border/60 last:border-b-0 hover:bg-bg cursor-pointer transition"
              >
                <td className="px-5 py-3 text-sm text-muted">{formatDateShort(inv.invoice_date)}</td>
                <td className="px-5 py-3 text-sm font-mono text-text">{inv.invoice_number}</td>
                <td className="px-5 py-3 text-sm text-text">{clientLabel(inv.client_id)}</td>
                <td className="px-5 py-3 text-sm text-text text-right font-medium">
                  {formatCurrency(inv.total_ht)}
                </td>
                <td className="px-5 py-3"><InvoiceStatusBadge invoice={inv} /></td>
                <td className="px-5 py-3">
                  <RowMenu
                    invoice={inv}
                    onDownload={() => handleDownload(inv.id)}
                    onMarkPaid={() => setPaidModalInvoice(inv)}
                    onMarkUnpaid={() => setConfirmAction({ type: 'unpaid', invoice: inv })}
                    onArchive={() => setConfirmAction({ type: 'archive', invoice: inv })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-3">
        {invoices.map((inv) => (
          <div
            key={inv.id}
            className="bg-surface rounded-2xl border border-border/40 shadow-card p-4 flex items-start justify-between gap-2"
          >
            <button onClick={() => navigate(`/invoices/${inv.id}`)} className="flex-1 text-left">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-mono text-text">{inv.invoice_number}</span>
                <InvoiceStatusBadge invoice={inv} />
              </div>
              <div className="text-xs text-muted">{clientLabel(inv.client_id)}</div>
              <div className="text-xs text-muted mt-2 flex items-center justify-between">
                <span>{formatDateShort(inv.invoice_date)}</span>
                <span className="text-sm font-medium text-text">{formatCurrency(inv.total_ht)}</span>
              </div>
            </button>
            <RowMenu
              invoice={inv}
              onDownload={() => handleDownload(inv.id)}
              onMarkPaid={() => setPaidModalInvoice(inv)}
              onMarkUnpaid={() => setConfirmAction({ type: 'unpaid', invoice: inv })}
              onArchive={() => setConfirmAction({ type: 'archive', invoice: inv })}
            />
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={executeAction}
        loading={actionLoading}
        title={
          !confirmAction
            ? ''
            : confirmAction.type === 'unpaid'
              ? `Démarquer ${confirmAction.invoice.invoice_number} comme payée ?`
              : `Archiver ${confirmAction.invoice.invoice_number} ?`
        }
        description={
          !confirmAction
            ? null
            : confirmAction.type === 'archive'
              ? "La facture n'apparaîtra plus dans la liste mais reste en base."
              : 'Le statut redevient « En attente » et la facture redevient éditable.'
        }
        confirmLabel={
          !confirmAction
            ? 'Confirmer'
            : confirmAction.type === 'archive'
              ? 'Archiver'
              : 'Démarquer'
        }
        confirmVariant={confirmAction?.type === 'archive' ? 'danger' : 'primary'}
      />

      {paidModalInvoice && (
        <MarkPaidModal
          open
          invoice={paidModalInvoice}
          mode="mark"
          loading={markPaid.isPending}
          onClose={() => setPaidModalInvoice(null)}
          onConfirm={async (paidAt) => {
            await markPaid.mutateAsync({ id: paidModalInvoice.id, paidAt })
            setPaidModalInvoice(null)
          }}
        />
      )}
    </>
  )
}
