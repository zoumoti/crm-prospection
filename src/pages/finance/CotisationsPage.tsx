import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useInvoices } from '@/features/invoices/hooks'
import { useCompanySettings } from '@/features/settings/hooks'
import { useTaxDeclarations, useCreateTaxDeclaration, useDeleteTaxDeclaration } from '@/features/taxes/hooks'
import { CurrentPeriodCard } from '@/features/taxes/CurrentPeriodCard'
import { PeriodHistoryList, type HistoryItem } from '@/features/taxes/PeriodHistoryList'
import { ConfirmDeclarationDialog, DeleteDeclarationDialog } from '@/features/taxes/TaxDeclarationDialogs'
import {
  getCurrentPeriod,
  listPeriodsBetween,
  periodRange,
  periodDeadline,
  periodKey,
  type Period,
} from '@/features/taxes/periods'
import type { TaxDeclaration } from '@/types/database'

function caBrutFor(
  invoices: { paid_at: string | null; total_ht: number | string; status: string }[] | undefined,
  p: Period
): number {
  if (!invoices) return 0
  const { start, endExclusive } = periodRange(p)
  return invoices
    .filter((inv) =>
      inv.status === 'paid' &&
      inv.paid_at &&
      inv.paid_at.slice(0, 10) >= start &&
      inv.paid_at.slice(0, 10) < endExclusive
    )
    .reduce((s, inv) => s + Number(inv.total_ht), 0)
}

function findSnapshot(decls: TaxDeclaration[] | undefined, p: Period): TaxDeclaration | undefined {
  return decls?.find(
    (d) => d.period_type === p.type && d.period_year === p.year && d.period_index === p.index
  )
}

export function CotisationsPage() {
  const navigate = useNavigate()
  const { data: company, isLoading: cLoading } = useCompanySettings()
  const { data: invoices, isLoading: iLoading } = useInvoices()
  const { data: declarations, isLoading: dLoading } = useTaxDeclarations()
  const create = useCreateTaxDeclaration()
  const del = useDeleteTaxDeclaration()

  const [confirmPeriod, setConfirmPeriod] = useState<Period | null>(null)
  const [cancelTarget, setCancelTarget] = useState<{
    id: string; period: Period; amount: number
  } | null>(null)

  const loading = cLoading || iLoading || dLoading
  const frequency = company?.tax_frequency ?? 'quarterly'
  const rate = company?.tax_rate
  const acre = company?.tax_acre ?? false

  const today = useMemo(() => new Date(), [])
  const currentPeriod = useMemo(() => getCurrentPeriod(today, frequency), [today, frequency])
  const currentCa = useMemo(() => caBrutFor(invoices, currentPeriod), [invoices, currentPeriod])
  const currentAmount = useMemo(
    () => (rate == null ? 0 : Math.round(currentCa * Number(rate)) / 100),
    [currentCa, rate]
  )

  const historyItems: HistoryItem[] = useMemo(() => {
    if (rate == null) return []
    const paidInvoices = (invoices ?? []).filter((i) => i.status === 'paid')
    const earliestPaid = paidInvoices
      .map((i) => i.paid_at)
      .filter((s): s is string => !!s)
      .sort()[0]
    const earliestDecl = (declarations ?? [])
      .map((d) => d.paid_at)
      .sort()[0]
    const earliest = [earliestPaid, earliestDecl].filter(Boolean).sort()[0]
    if (!earliest) return []
    const periods = listPeriodsBetween(new Date(earliest), today, frequency)
    const items: HistoryItem[] = periods
      .filter((p) => !(p.year === currentPeriod.year && p.index === currentPeriod.index && p.type === currentPeriod.type))
      .map((p) => {
        const snap = findSnapshot(declarations, p)
        if (snap) {
          return {
            period: p,
            status: 'paid' as const,
            amount: Number(snap.amount_due_snapshot),
            declarationId: snap.id,
          }
        }
        const ca = caBrutFor(invoices, p)
        const amount = Math.round(ca * Number(rate)) / 100
        const dl = periodDeadline(p)
        return {
          period: p,
          status: (dl.getTime() < today.getTime() ? 'overdue' : 'due') as 'overdue' | 'due',
          amount,
        }
      })
    const inferredKeys = new Set(items.map((it) => periodKey(it.period)))
    for (const d of declarations ?? []) {
      const p: Period = { type: d.period_type, year: d.period_year, index: d.period_index }
      if (!inferredKeys.has(periodKey(p))) {
        items.push({
          period: p,
          status: 'paid',
          amount: Number(d.amount_due_snapshot),
          declarationId: d.id,
        })
      }
    }
    return items.sort((a, b) => {
      const aKey = `${a.period.year}-${String(a.period.index).padStart(2, '0')}`
      const bKey = `${b.period.year}-${String(b.period.index).padStart(2, '0')}`
      return aKey < bKey ? 1 : aKey > bKey ? -1 : 0
    })
  }, [declarations, invoices, frequency, currentPeriod, today, rate])

  function openConfirm(p: Period) {
    setConfirmPeriod(p)
  }

  async function submitDeclaration() {
    if (!confirmPeriod || rate == null) return
    const ca = caBrutFor(invoices, confirmPeriod)
    const amount = Math.round(ca * Number(rate)) / 100
    await create.mutateAsync({
      period_type: confirmPeriod.type,
      period_year: confirmPeriod.year,
      period_index: confirmPeriod.index,
      ca_brut_snapshot: ca,
      rate_snapshot: Number(rate),
      acre_snapshot: acre,
      amount_due_snapshot: amount,
    })
    setConfirmPeriod(null)
  }

  async function submitCancel() {
    if (!cancelTarget) return
    await del.mutateAsync(cancelTarget.id)
    setCancelTarget(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" className="text-accent" />
      </div>
    )
  }

  if (rate == null) {
    return (
      <Card>
        <h2 className="text-base font-semibold text-text mb-2">Configurez votre taux</h2>
        <p className="text-sm text-muted mb-4">
          Pour calculer les cotisations, configure d'abord ton taux URSSAF dans les paramètres.
        </p>
        <Button onClick={() => navigate('/settings')}>Aller aux paramètres →</Button>
      </Card>
    )
  }

  const currentSnap = findSnapshot(declarations, currentPeriod)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-text">Cotisations</h1>

      <div className="rounded-xl bg-accent/10 px-4 py-3 text-sm text-text">
        Les cotisations se calculent sur le CA brut encaissé, pas sur le bénéfice net.
      </div>

      {currentSnap ? (
        <Card>
          <div className="text-xs text-muted">Période courante (déjà déclarée)</div>
          <h2 className="text-xl font-semibold text-text mt-1">
            Cette période est déjà marquée comme déclarée. Voir l'historique ci-dessous pour annuler si besoin.
          </h2>
        </Card>
      ) : (
        <CurrentPeriodCard
          period={currentPeriod}
          caBrut={currentCa}
          rate={Number(rate)}
          acre={acre}
          amountDue={currentAmount}
          onMarkPaid={() => openConfirm(currentPeriod)}
          isPending={create.isPending}
        />
      )}

      <div>
        <h2 className="text-base font-semibold text-text mb-3">Historique</h2>
        <PeriodHistoryList
          items={historyItems}
          onMarkPaid={(p) => openConfirm(p)}
          onCancel={(id, p, amount) => setCancelTarget({ id, period: p, amount })}
        />
      </div>

      {confirmPeriod && (
        <ConfirmDeclarationDialog
          open
          onClose={() => setConfirmPeriod(null)}
          onConfirm={submitDeclaration}
          period={confirmPeriod}
          caBrut={caBrutFor(invoices, confirmPeriod)}
          rate={Number(rate)}
          acre={acre}
          amountDue={Math.round(caBrutFor(invoices, confirmPeriod) * Number(rate)) / 100}
          loading={create.isPending}
        />
      )}

      {cancelTarget && (
        <DeleteDeclarationDialog
          open
          onClose={() => setCancelTarget(null)}
          onConfirm={submitCancel}
          period={cancelTarget.period}
          amount={cancelTarget.amount}
          loading={del.isPending}
        />
      )}
    </div>
  )
}
