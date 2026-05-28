import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { PDFViewer } from '@react-pdf/renderer'
import { ArrowLeft, Pencil, Download, CheckCircle, RotateCcw, MoreHorizontal, Archive, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { InvoiceStatusBadge } from './components/InvoiceStatusBadge'
import {
  useInvoice,
  useMarkPaid,
  useMarkUnpaid,
  useArchiveInvoice,
  useSetPaidAt,
} from '@/features/invoices/hooks'
import { getImportedPdfSignedUrl } from '@/features/invoices/api'
import { MarkPaidModal } from '@/features/invoices/MarkPaidModal'
import { useCompanySettings } from '@/features/settings/hooks'
import { formatCurrency, formatDateShort } from '@/features/invoices/totals'
import { downloadInvoicePdf, fetchLogoAsBase64 } from '@/features/invoices/pdf/helpers'
import { InvoicePdf } from '@/features/invoices/pdf/InvoicePdf'

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useInvoice(id)
  const { data: settings } = useCompanySettings()
  const markPaid = useMarkPaid()
  const markUnpaid = useMarkUnpaid()
  const archive = useArchiveInvoice()
  const setPaidAt = useSetPaidAt()

  const [showPreview, setShowPreview] = useState(true)
  const [logoBase64, setLogoBase64] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [confirmAction, setConfirmAction] = useState<'unpaid' | 'archive' | null>(null)
  const [markPaidOpen, setMarkPaidOpen] = useState(false)
  const [editPaidAtOpen, setEditPaidAtOpen] = useState(false)
  const [importedSignedUrl, setImportedSignedUrl] = useState<string | null>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    let cancelled = false
    const logoPath = settings?.logo_path ?? null
    const promise = logoPath ? fetchLogoAsBase64(logoPath) : Promise.resolve(null)
    promise.then((b64) => {
      if (!cancelled) setLogoBase64(b64)
    })
    return () => {
      cancelled = true
    }
  }, [settings?.logo_path])

  // Fetch signed URL for imported PDFs (1h TTL). The hook re-runs on path change
  // and on each detail-page mount, which is acceptable — signed URLs are cheap.
  const importedPath = data?.invoice.imported_pdf_path ?? null
  useEffect(() => {
    if (!importedPath) {
      setImportedSignedUrl(null)
      return
    }
    let cancelled = false
    getImportedPdfSignedUrl(importedPath)
      .then((url) => {
        if (!cancelled) setImportedSignedUrl(url)
      })
      .catch((err) => {
        console.error('[invoices] failed to sign imported PDF url', err)
      })
    return () => {
      cancelled = true
    }
  }, [importedPath])

  const pdfProps = useMemo(() => {
    if (!data || !settings) return null
    return {
      invoice: data.invoice,
      lines: data.lines,
      client: data.client,
      settings,
      logoBase64,
    }
  }, [data, settings, logoBase64])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" className="text-accent" />
      </div>
    )
  }

  if (isError || !data) {
    return <Navigate to="/invoices" replace />
  }

  const { invoice, client } = data
  const isPaid = invoice.status === 'paid'
  const isImported = !!invoice.imported_pdf_path

  async function handleDownload() {
    if (isImported && invoice.imported_pdf_path) {
      // Imported PDF: fetch the signed URL, download as a blob to force the
      // "Save as" dialog (cross-origin `download` attr is otherwise ignored).
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
    if (!pdfProps) return
    await downloadInvoicePdf(pdfProps)
  }

  async function executeAction() {
    if (!confirmAction || !invoice) return
    if (confirmAction === 'unpaid') await markUnpaid.mutateAsync(invoice.id)
    else if (confirmAction === 'archive') {
      await archive.mutateAsync(invoice.id)
      navigate('/invoices')
      return
    }
    setConfirmAction(null)
  }

  const actionLoading = markUnpaid.isPending || archive.isPending

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back link on its own row */}
      <button
        onClick={() => navigate('/invoices')}
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-text transition"
      >
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      {/* Action buttons: wrap on small screens, full-width buttons stacked when needed */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          onClick={handleDownload}
          disabled={!isImported && !pdfProps}
          className="flex-1 sm:flex-initial min-w-0"
        >
          <Download className="h-4 w-4" /> Télécharger PDF
        </Button>
        {!isPaid ? (
          <>
            {!isImported && (
              <Button
                variant="secondary"
                onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                className="flex-1 sm:flex-initial min-w-0"
              >
                <Pencil className="h-4 w-4" /> Modifier
              </Button>
            )}
            <Button
              onClick={() => setMarkPaidOpen(true)}
              className="flex-1 sm:flex-initial min-w-0"
            >
              <CheckCircle className="h-4 w-4" /> Marquer payée
            </Button>
          </>
        ) : (
          <Button
            variant="secondary"
            onClick={() => setConfirmAction('unpaid')}
            className="flex-1 sm:flex-initial min-w-0"
          >
            <RotateCcw className="h-4 w-4" /> Démarquer payée
          </Button>
        )}
        <div ref={menuRef} className="relative shrink-0">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Plus d'actions"
            className="h-11 w-11 rounded-xl border border-border bg-surface flex items-center justify-center text-text hover:bg-bg transition"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-surface border border-border shadow-card p-2 z-30">
              <button
                onClick={() => {
                  setMenuOpen(false)
                  setConfirmAction('archive')
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-danger hover:bg-danger/10 transition"
              >
                <Archive className="h-4 w-4" /> Archiver
              </button>
            </div>
          )}
        </div>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-text mb-1 break-words">
              Facture <span className="font-mono">{invoice.invoice_number}</span>
            </h1>
            <p className="text-sm text-muted">
              Émise le {formatDateShort(invoice.invoice_date)}
              {invoice.due_date ? ` · Échéance ${formatDateShort(invoice.due_date)}` : ' · À réception'}
            </p>
            <p className="text-sm text-text mt-2 break-words">
              {client.first_name} {client.last_name}
              {client.company && ` · ${client.company}`}
              {' · '}
              <span className="font-mono text-muted">{client.code_client}</span>
            </p>
          </div>
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0">
            <div className="flex flex-col items-end gap-1">
              <InvoiceStatusBadge invoice={invoice} />
              {isPaid && (
                <button
                  onClick={() => setEditPaidAtOpen(true)}
                  className="text-xs text-muted hover:text-text underline"
                >
                  Modifier la date d'encaissement
                </button>
              )}
            </div>
            <div className="text-xl sm:text-2xl font-semibold text-text whitespace-nowrap">
              {formatCurrency(invoice.total_ht)}
            </div>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-sm font-semibold text-text">Aperçu PDF</h2>
          {isImported && (
            <span className="inline-flex items-center gap-1 text-xs rounded-full bg-accent-soft text-accent px-2 py-0.5">
              <FileText className="h-3 w-3" /> PDF importé
            </span>
          )}
        </div>
        <button
          onClick={() => setShowPreview((s) => !s)}
          className="text-sm text-accent hover:underline shrink-0"
        >
          {showPreview ? 'Cacher l\'aperçu' : 'Voir l\'aperçu'}
        </button>
      </div>

      {showPreview && isImported && importedSignedUrl && (
        <div className="h-[80vh] rounded-2xl overflow-hidden border border-border/40">
          <iframe
            title={`Facture ${invoice.invoice_number}`}
            src={importedSignedUrl}
            className="w-full h-full bg-bg border-0"
          />
        </div>
      )}

      {showPreview && isImported && !importedSignedUrl && (
        <div className="h-32 rounded-2xl border border-border/40 flex items-center justify-center">
          <Spinner size="sm" className="text-accent" />
        </div>
      )}

      {showPreview && !isImported && pdfProps && (
        <div className="h-[80vh] rounded-2xl overflow-hidden border border-border/40">
          <PDFViewer width="100%" height="100%" showToolbar={false}>
            <InvoicePdf {...pdfProps} />
          </PDFViewer>
        </div>
      )}

      <ConfirmDialog
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={executeAction}
        loading={actionLoading}
        title={
          confirmAction === 'unpaid'
            ? `Démarquer ${invoice.invoice_number} comme payée ?`
            : confirmAction === 'archive'
              ? `Archiver ${invoice.invoice_number} ?`
              : ''
        }
        description={
          confirmAction === 'unpaid'
            ? 'Le statut redevient « En attente » et la facture redevient éditable.'
            : confirmAction === 'archive'
              ? "La facture n'apparaîtra plus dans la liste mais reste en base."
              : null
        }
        confirmLabel={
          confirmAction === 'unpaid'
            ? 'Démarquer'
            : confirmAction === 'archive'
              ? 'Archiver'
              : 'Confirmer'
        }
        confirmVariant={confirmAction === 'archive' ? 'danger' : 'primary'}
      />

      {markPaidOpen && (
        <MarkPaidModal
          open
          invoice={invoice}
          mode="mark"
          loading={markPaid.isPending}
          onClose={() => setMarkPaidOpen(false)}
          onConfirm={async (paidAt) => {
            await markPaid.mutateAsync({ id: invoice.id, paidAt })
            setMarkPaidOpen(false)
          }}
        />
      )}

      {editPaidAtOpen && (
        <MarkPaidModal
          open
          invoice={invoice}
          mode="edit"
          loading={setPaidAt.isPending}
          onClose={() => setEditPaidAtOpen(false)}
          onConfirm={async (paidAt) => {
            await setPaidAt.mutateAsync({ id: invoice.id, paidAt })
            setEditPaidAtOpen(false)
          }}
        />
      )}
    </div>
  )
}

export default InvoiceDetailPage
