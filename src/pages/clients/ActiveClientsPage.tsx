import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useMatch } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { Input } from '@/components/ui/Input'
import { ClientsTable } from './components/ClientsTable'
import { ClientFormDrawer } from './components/ClientFormDrawer'
import {
  useClients,
  useClient,
  useCreateClient,
  useUpdateClient,
} from '@/features/clients/hooks'
import type { ClientFormOutput } from '@/features/clients/schema'

function normalizeForSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export function ActiveClientsPage() {
  const navigate = useNavigate()
  const params = useParams<{ id?: string }>()
  const matchNew = useMatch('/clients/new')
  const matchEdit = useMatch('/clients/:id/edit')

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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200)
    return () => clearTimeout(t)
  }, [search])

  const { data: clients, isLoading, isError, refetch } = useClients()
  const editingClientQuery = useClient(editingId)
  const createMutation = useCreateClient()
  const updateMutation = useUpdateClient(editingId ?? '')

  const filtered = useMemo(() => {
    if (!clients) return []
    if (!debouncedSearch.trim()) return clients
    const needle = normalizeForSearch(debouncedSearch.trim())
    return clients.filter((c) => {
      const haystack = normalizeForSearch(
        `${c.first_name} ${c.last_name} ${c.company ?? ''}`
      )
      return haystack.includes(needle)
    })
  }, [clients, debouncedSearch])

  function closeDrawer() {
    setSubmitError(null)
    navigate('/clients')
  }

  async function handleSubmit(values: ClientFormOutput) {
    setSubmitError(null)
    try {
      if (mode === 'create') {
        await createMutation.mutateAsync(values)
      } else if (mode === 'edit' && editingId) {
        await updateMutation.mutateAsync(values)
      }
      closeDrawer()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    }
  }

  const submitting = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou entreprise…"
              className="pl-9"
            />
          </div>
          <Button onClick={() => navigate('/clients/new')}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Ajouter un client</span>
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
            <p className="text-sm text-danger mb-3">
              Impossible de charger les clients.
            </p>
            <Button variant="secondary" onClick={() => refetch()}>
              Réessayer
            </Button>
          </Card>
        )}

        {!isLoading && !isError && clients && clients.length === 0 && (
          <Card className="text-center py-12">
            <p className="text-sm text-muted mb-4">
              Aucun client pour l'instant.
            </p>
            <Button onClick={() => navigate('/clients/new')}>
              <Plus className="h-4 w-4" />
              Ajouter votre premier client
            </Button>
          </Card>
        )}

        {!isLoading &&
          !isError &&
          clients &&
          clients.length > 0 &&
          filtered.length === 0 && (
            <Card className="text-center">
              <p className="text-sm text-muted">
                Aucun client ne correspond à «&nbsp;{debouncedSearch}&nbsp;».
              </p>
            </Card>
          )}

        {!isLoading && !isError && filtered.length > 0 && (
          <ClientsTable clients={filtered} />
        )}
      </div>

      <ClientFormDrawer
        open={drawerOpen}
        mode={mode === 'create' ? 'create' : 'edit'}
        client={editingClientQuery.data}
        isLoadingClient={mode === 'edit' && editingClientQuery.isLoading}
        submitting={submitting}
        errorMessage={submitError}
        onClose={closeDrawer}
        onSubmit={handleSubmit}
      />
    </>
  )
}
