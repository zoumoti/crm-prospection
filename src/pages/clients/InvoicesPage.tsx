import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { Input } from '@/components/ui/Input'
import { Combobox } from '@/components/ui/Combobox'
import { InvoicesTable } from './components/InvoicesTable'
import { useInvoices } from '@/features/invoices/hooks'
import { useClients } from '@/features/clients/hooks'
import { useCanCreateInvoice } from '@/features/settings/hooks'
import { computeDisplayStatus, type DisplayStatus } from '@/features/invoices/status'
import { cn } from '@/lib/utils'
import type { Invoice } from '@/types/database'

const STATUS_FILTERS: { value: DisplayStatus; label: string }[] = [
  { value: 'pending', label: 'En attente' },
  { value: 'late', label: 'En retard' },
  { value: 'paid', label: 'Payée' },
]

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function InvoicesPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { canCreate, isLoading: settingsLoading } = useCanCreateInvoice()

  const clientFilter = searchParams.get('client') || ''
  const monthFilter = searchParams.get('month') || ''
  const statusesFilter = searchParams.get('statuses')?.split(',').filter(Boolean) as DisplayStatus[] | undefined

  const { data: clients = [] } = useClients()
  const clientLabel = useCallback(
    (id: string) => {
      const c = clients.find((x) => x.id === id)
      return c ? `${c.first_name} ${c.last_name}` : '—'
    },
    [clients]
  )
  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: `${c.first_name} ${c.last_name}`,
    meta: c.company ?? c.code_client,
  }))

  const { data: invoices = [], isLoading, isError, refetch } = useInvoices({
    clientId: clientFilter || undefined,
    month: monthFilter || undefined,
  })

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200)
    return () => clearTimeout(t)
  }, [search])

  const filtered = useMemo(() => {
    let list: Invoice[] = invoices
    if (statusesFilter && statusesFilter.length > 0) {
      list = list.filter((inv) => statusesFilter.includes(computeDisplayStatus(inv)))
    }
    if (debouncedSearch.trim()) {
      const needle = normalize(debouncedSearch.trim())
      list = list.filter((inv) => {
        const haystack = normalize(`${inv.invoice_number} ${clientLabel(inv.client_id)}`)
        return haystack.includes(needle)
      })
    }
    return list
  }, [invoices, debouncedSearch, statusesFilter, clientLabel])

  function setParam(key: string, value: string | null) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value === null || value === '') next.delete(key)
      else next.set(key, value)
      return next
    })
  }

  function toggleStatus(status: DisplayStatus) {
    const current = statusesFilter ?? []
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status]
    setParam('statuses', next.length > 0 ? next.join(',') : null)
  }

  return (
    <div className="space-y-6">
      {!settingsLoading && !canCreate && (
        <div className="flex items-start gap-3 rounded-xl bg-warning/10 text-warning border border-warning/30 px-4 py-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            Pour émettre des factures, renseigne d'abord les infos de ton entreprise dans{' '}
            <button
              onClick={() => navigate('/settings')}
              className="underline font-medium hover:text-text"
            >
              Paramètres
            </button>.
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par numéro ou client…"
            className="pl-9"
          />
        </div>
        <Button
          onClick={() => navigate('/invoices/new')}
          disabled={!canCreate}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Créer une facture</span>
          <span className="sm:hidden">Créer</span>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-48 min-w-0">
          <Combobox
            options={clientOptions}
            value={clientFilter || null}
            onChange={(v) => setParam('client', v)}
            placeholder="Tous les clients"
            allowClear
          />
        </div>
        <Input
          type="month"
          value={monthFilter}
          onChange={(e) => setParam('month', e.target.value)}
          className="w-full sm:w-44 min-w-0"
        />
        <div className="flex items-center gap-1 flex-wrap">
          {STATUS_FILTERS.map((s) => {
            const active = statusesFilter?.includes(s.value) ?? false
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => toggleStatus(s.value)}
                className={cn(
                  'px-3 h-9 rounded-lg text-xs font-medium border transition',
                  active
                    ? 'bg-accent-soft text-accent border-accent/30'
                    : 'bg-surface text-muted border-border hover:bg-bg'
                )}
              >
                {s.label}
              </button>
            )
          })}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" className="text-accent" />
        </div>
      )}

      {isError && (
        <Card className="text-center">
          <p className="text-sm text-danger mb-3">Impossible de charger les factures.</p>
          <Button variant="secondary" onClick={() => refetch()}>Réessayer</Button>
        </Card>
      )}

      {!isLoading && !isError && invoices.length === 0 && (
        <Card className="text-center py-12">
          <p className="text-sm text-muted mb-4">Aucune facture pour l'instant.</p>
          {canCreate && (
            <Button onClick={() => navigate('/invoices/new')}>
              <Plus className="h-4 w-4" /> Créer votre première facture
            </Button>
          )}
        </Card>
      )}

      {!isLoading && !isError && invoices.length > 0 && filtered.length === 0 && (
        <Card className="text-center">
          <p className="text-sm text-muted">Aucune facture ne correspond aux filtres.</p>
        </Card>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <InvoicesTable invoices={filtered} clientLabel={clientLabel} />
      )}
    </div>
  )
}
