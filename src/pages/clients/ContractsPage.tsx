import { useEffect, useMemo, useState } from 'react'
import {
  useNavigate,
  useParams,
  useMatch,
  useSearchParams,
} from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { Input } from '@/components/ui/Input'
import { Combobox } from '@/components/ui/Combobox'
import { ContractsTable } from './components/ContractsTable'
import { ContractFormDrawer } from './components/ContractFormDrawer'
import {
  useContracts,
  useContract,
  useCreateContract,
  useUpdateContract,
} from '@/features/contracts/hooks'
import { useClients } from '@/features/clients/hooks'
import type { ContractFormOutput } from '@/features/contracts/schema'

function normalizeForSearch(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function ContractsPage() {
  const navigate = useNavigate()
  const params = useParams<{ id?: string }>()
  const matchNew = useMatch('/contracts/new')
  const matchEdit = useMatch('/contracts/:id/edit')
  const [searchParams, setSearchParams] = useSearchParams()
  const clientQueryParam = searchParams.get('client')

  const mode: 'create' | 'edit' | null = matchNew
    ? 'create'
    : matchEdit
      ? 'edit'
      : null
  const drawerOpen = mode !== null
  const editingId = matchEdit ? params.id : undefined

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  // The URL is the single source of truth for the client filter — no local state.
  // This avoids desync when navigating /contracts/new?client=A → /contracts/new?client=B.
  const clientFilter = clientQueryParam

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200)
    return () => clearTimeout(t)
  }, [search])

  const { data: contracts, isLoading, isError, refetch } = useContracts()
  const { data: clients = [] } = useClients()
  const editingQuery = useContract(editingId)
  const createMutation = useCreateContract()
  const updateMutation = useUpdateContract(editingId ?? '')

  const clientLabel = (clientId: string): string => {
    const c = clients.find((x) => x.id === clientId)
    return c ? `${c.first_name} ${c.last_name}` : '—'
  }

  const clientOptions = useMemo(
    () =>
      clients.map((c) => ({
        value: c.id,
        label: `${c.first_name} ${c.last_name}`,
        meta: c.company ? `${c.company} · ${c.code_client}` : c.code_client,
      })),
    [clients]
  )

  const filtered = useMemo(() => {
    if (!contracts) return []
    let list = contracts
    if (clientFilter) {
      list = list.filter((c) => c.client_id === clientFilter)
    }
    if (debouncedSearch.trim()) {
      const needle = normalizeForSearch(debouncedSearch.trim())
      list = list.filter((c) => normalizeForSearch(c.name).includes(needle))
    }
    return list
  }, [contracts, clientFilter, debouncedSearch])

  function setClientFilter(value: string | null) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set('client', value)
    else next.delete('client')
    setSearchParams(next, { replace: true })
  }

  function closeDrawer() {
    setSubmitError(null)
    const qs = clientFilter ? `?client=${clientFilter}` : ''
    navigate(`/contracts${qs}`)
  }

  async function handleSubmit(values: ContractFormOutput) {
    setSubmitError(null)
    try {
      if (mode === 'create') {
        if (!values.file) {
          setSubmitError('Fichier requis.')
          return
        }
        await createMutation.mutateAsync({
          client_id: values.client_id,
          name: values.name,
          signed_at: values.signed_at,
          notes: values.notes,
          file: values.file,
        })
      } else if (mode === 'edit' && editingId && editingQuery.data) {
        await updateMutation.mutateAsync({
          client_id: values.client_id,
          name: values.name,
          signed_at: values.signed_at,
          notes: values.notes,
          newFile: values.file,
          currentStoragePath: editingQuery.data.storage_path,
        })
      }
      closeDrawer()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    }
  }

  const submitting = createMutation.isPending || updateMutation.isPending
  const hasActiveClients = clients.length > 0

  const drawerDefaultClient =
    mode === 'create' && clientQueryParam ? clientQueryParam : undefined

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-center flex-1">
            <div className="md:w-64">
              <Combobox
                options={clientOptions}
                value={clientFilter}
                onChange={setClientFilter}
                placeholder="Tous les clients"
                emptyMessage="Aucun client"
                allowClear
              />
            </div>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom de contrat…"
                className="pl-9"
              />
            </div>
          </div>
          <Button
            onClick={() => {
              const qs = clientFilter ? `?client=${clientFilter}` : ''
              navigate(`/contracts/new${qs}`)
            }}
            disabled={!hasActiveClients}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Ajouter un contrat</span>
            <span className="sm:hidden">Ajouter</span>
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" className="text-accent" />
          </div>
        )}

        {isError && (
          <Card className="text-center">
            <p className="text-sm text-danger mb-3">Impossible de charger les contrats.</p>
            <Button variant="secondary" onClick={() => refetch()}>
              Réessayer
            </Button>
          </Card>
        )}

        {!isLoading && !isError && !hasActiveClients && (
          <Card className="text-center py-12">
            <p className="text-sm text-muted mb-4">
              Crée d'abord un client pour pouvoir lui associer un contrat.
            </p>
            <Button variant="secondary" onClick={() => navigate('/clients/new')}>
              Aller aux clients
            </Button>
          </Card>
        )}

        {!isLoading &&
          !isError &&
          hasActiveClients &&
          contracts &&
          contracts.length === 0 && (
            <Card className="text-center py-12">
              <p className="text-sm text-muted mb-4">Aucun contrat pour l'instant.</p>
              <Button onClick={() => navigate('/contracts/new')}>
                <Plus className="h-4 w-4" />
                Ajouter votre premier contrat
              </Button>
            </Card>
          )}

        {!isLoading &&
          !isError &&
          hasActiveClients &&
          contracts &&
          contracts.length > 0 &&
          filtered.length === 0 && (
            <Card className="text-center">
              <p className="text-sm text-muted">
                Aucun contrat ne correspond aux filtres.
              </p>
            </Card>
          )}

        {!isLoading && !isError && filtered.length > 0 && (
          <ContractsTable contracts={filtered} clientLabel={clientLabel} />
        )}
      </div>

      <ContractFormDrawer
        open={drawerOpen}
        mode={mode === 'create' ? 'create' : 'edit'}
        contract={editingQuery.data}
        isLoadingContract={mode === 'edit' && editingQuery.isLoading}
        submitting={submitting}
        errorMessage={submitError}
        defaultClientId={drawerDefaultClient}
        onClose={closeDrawer}
        onSubmit={handleSubmit}
      />
    </>
  )
}
