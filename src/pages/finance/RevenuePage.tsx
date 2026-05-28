import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams, useMatch } from 'react-router-dom'
import { Plus, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Spinner } from '@/components/ui/Spinner'
import { MonthSelector } from '@/components/ui/MonthSelector'
import { useInvoices } from '@/features/invoices/hooks'
import { useClients } from '@/features/clients/hooks'
import { useExpenses, useArchiveExpense } from '@/features/expenses/hooks'
import { useCompanySettings } from '@/features/settings/hooks'
import { RevenueKpis } from '@/features/expenses/RevenueKpis'
import { Revenue12MonthChart, type MonthlySummary } from '@/features/expenses/Revenue12MonthChart'
import { TransactionsList, type TransactionRow } from '@/features/expenses/TransactionsList'
import { ExpenseDrawer } from '@/features/expenses/ExpenseDrawer'
import { ExportPdfModal, type ExportRange } from '@/features/expenses/ExportPdfModal'
import * as expensesApi from '@/features/expenses/api'

const MONTH_SHORT_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

function todayYM(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function ymFromIsoTs(iso: string | null): string | null {
  if (!iso) return null
  return iso.slice(0, 7)
}

function ymFromIsoDate(d: string): string {
  return d.slice(0, 7)
}

function monthShortLabel(ym: string): string {
  const [, m] = ym.split('-')
  const idx = Number(m) - 1
  const year2 = ym.slice(2, 4)
  return `${MONTH_SHORT_FR[idx]} ${year2}`
}

function rolling12Months(toYM: string): string[] {
  const [y, m] = toYM.split('-').map(Number)
  const out: string[] = []
  let yy = y
  let mm = m
  for (let i = 0; i < 12; i++) {
    out.unshift(`${yy}-${String(mm).padStart(2, '0')}`)
    mm -= 1
    if (mm < 1) { mm = 12; yy -= 1 }
  }
  return out
}

export function RevenuePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { id: editId } = useParams()
  const newMatch = useMatch('/finance/revenue/expense/new')
  const editMatch = useMatch('/finance/revenue/expense/:id/edit')
  const drawerOpen = !!newMatch || !!editMatch

  const month = searchParams.get('month') ?? todayYM()

  // Fetch all invoices (no status filter at API level — filter paid in-memory)
  const { data: allInvoices, isLoading: invLoading } = useInvoices()
  const invoices = useMemo(
    () => (allInvoices ?? []).filter((inv) => inv.status === 'paid'),
    [allInvoices]
  )

  const { data: clients } = useClients()
  const { data: expenses, isLoading: expLoading } = useExpenses()
  const { data: company } = useCompanySettings()
  const archive = useArchiveExpense()

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  function setMonth(next: string) {
    const params = new URLSearchParams(searchParams)
    params.set('month', next)
    setSearchParams(params, { replace: true })
  }

  const monthlyForChart: MonthlySummary[] = useMemo(() => {
    const ms = rolling12Months(todayYM())
    return ms.map((ym) => {
      const revs = invoices
        .filter((inv) => ymFromIsoTs(inv.paid_at) === ym)
        .reduce((s, inv) => s + Number(inv.total_ht), 0)
      const exps = (expenses ?? [])
        .filter((e) => ymFromIsoDate(e.expense_date) === ym)
        .reduce((s, e) => s + Number(e.amount), 0)
      return { month: ym, label: monthShortLabel(ym), revenues: revs, expenses: exps }
    })
  }, [invoices, expenses])

  const selectedMonthSummary = useMemo(() => {
    const revs = invoices
      .filter((inv) => ymFromIsoTs(inv.paid_at) === month)
      .reduce((s, inv) => s + Number(inv.total_ht), 0)
    const exps = (expenses ?? [])
      .filter((e) => ymFromIsoDate(e.expense_date) === month)
      .reduce((s, e) => s + Number(e.amount), 0)
    return { revenues: revs, expenses: exps }
  }, [invoices, expenses, month])

  const transactions: TransactionRow[] = useMemo(() => {
    const clientById = new Map((clients ?? []).map((c) => [c.id, c]))
    const revRows: TransactionRow[] = invoices
      .filter((inv) => ymFromIsoTs(inv.paid_at) === month)
      .map((inv) => ({
        kind: 'revenue' as const,
        date: (inv.paid_at ?? inv.invoice_date).slice(0, 10),
        invoice: inv,
        client: clientById.get(inv.client_id),
      }))
    const expRows: TransactionRow[] = (expenses ?? [])
      .filter((e) => ymFromIsoDate(e.expense_date) === month)
      .map((e) => ({ kind: 'expense' as const, date: e.expense_date, expense: e }))
    return [...revRows, ...expRows].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }, [invoices, expenses, clients, month])

  function openNew() {
    const params = new URLSearchParams(searchParams)
    navigate({ pathname: '/finance/revenue/expense/new', search: params.toString() })
  }
  function openEdit(id: string) {
    const params = new URLSearchParams(searchParams)
    navigate({ pathname: `/finance/revenue/expense/${id}/edit`, search: params.toString() })
  }
  function closeDrawer() {
    const params = new URLSearchParams(searchParams)
    navigate({ pathname: '/finance/revenue', search: params.toString() })
  }

  async function viewReceipt(storagePath: string) {
    const url = await expensesApi.getReceiptSignedUrl(storagePath)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function handleExport(range: ExportRange) {
    setExporting(true)
    try {
      const { downloadBilanPdf, fetchLogoAsBase64 } = await import('@/features/expenses/pdf/helpers')

      const [y, m] = month.split('-').map(Number)
      let startYM: string
      let endYM: string
      let periodLabel: string

      if (range.kind === 'month') {
        startYM = endYM = month
        periodLabel = `${MONTH_SHORT_FR[m - 1]} ${y}`
      } else if (range.kind === 'quarter') {
        const qStart = Math.floor((m - 1) / 3) * 3 + 1
        startYM = `${y}-${String(qStart).padStart(2, '0')}`
        endYM = `${y}-${String(qStart + 2).padStart(2, '0')}`
        const qi = Math.floor((m - 1) / 3) + 1
        periodLabel = `T${qi} ${y}`
      } else if (range.kind === 'year') {
        startYM = `${y}-01`
        endYM = `${y}-12`
        periodLabel = `Année ${y}`
      } else {
        startYM = range.startMonth
        endYM = range.endMonth
        periodLabel = `${startYM} → ${endYM}`
      }

      const inRange = (ym: string) => ym >= startYM && ym <= endYM

      const clientById = new Map((clients ?? []).map((c) => [c.id, c]))
      const revLines = invoices
        .filter((inv) => inv.paid_at && inRange(ymFromIsoTs(inv.paid_at)!))
        .map((inv) => {
          const c = clientById.get(inv.client_id)
          return {
            date: (inv.paid_at ?? inv.invoice_date).slice(0, 10),
            invoiceNumber: inv.invoice_number,
            clientName: c ? `${c.first_name} ${c.last_name}` : '—',
            amount: Number(inv.total_ht),
          }
        })
        .sort((a, b) => (a.date < b.date ? -1 : 1))
      const expLines = (expenses ?? [])
        .filter((e) => inRange(ymFromIsoDate(e.expense_date)))
        .map((e) => ({
          date: e.expense_date,
          category: e.category,
          description: e.description,
          amount: Number(e.amount),
        }))
        .sort((a, b) => (a.date < b.date ? -1 : 1))

      const logoDataUrl = await fetchLogoAsBase64(company?.logo_path ?? null)
      await downloadBilanPdf(
        { company: company ?? null, logoDataUrl, periodLabel, revenues: revLines, expenses: expLines },
        `bilan-${periodLabel.replace(/[^A-Za-z0-9_-]+/g, '_')}.pdf`
      )
      setExportOpen(false)
    } finally {
      setExporting(false)
    }
  }

  const loading = invLoading || expLoading

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-semibold text-text">Revenus & Dépenses</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setExportOpen(true)}>
            <FileDown className="h-4 w-4" /> Exporter PDF
          </Button>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Nouvelle dépense
          </Button>
        </div>
      </div>

      <MonthSelector value={month} onChange={setMonth} />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" className="text-accent" />
        </div>
      ) : (
        <>
          <RevenueKpis
            revenues={selectedMonthSummary.revenues}
            expenses={selectedMonthSummary.expenses}
          />
          <Card>
            <Revenue12MonthChart data={monthlyForChart} selectedMonth={month} />
          </Card>
          <Card>
            <h2 className="text-base font-semibold text-text mb-3">Transactions du mois</h2>
            <TransactionsList
              rows={transactions}
              onEditExpense={openEdit}
              onDeleteExpense={(id) => setConfirmDelete(id)}
              onViewReceipt={(p) => void viewReceipt(p)}
            />
          </Card>
        </>
      )}

      {drawerOpen && (
        <ExpenseDrawer
          mode={editMatch ? 'edit' : 'create'}
          id={editId}
          onClose={closeDrawer}
        />
      )}

      <ExportPdfModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onExport={handleExport}
        loading={exporting}
        defaultMonth={month}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (confirmDelete) await archive.mutateAsync(confirmDelete)
          setConfirmDelete(null)
        }}
        title="Supprimer cette dépense ?"
        description="La dépense sera archivée et disparaîtra des listes. Le justificatif est conservé."
        confirmLabel="Supprimer"
        confirmVariant="danger"
        loading={archive.isPending}
      />
    </div>
  )
}
