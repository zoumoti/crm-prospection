import { useMemo, useState } from 'react'
import { useNavigate, useParams, useMatch, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TaskFiltersBar, type TaskTab } from './components/TaskFiltersBar'
import { TasksList } from './components/TasksList'
import { CompletedSection } from './components/CompletedSection'
import { TaskFormDrawer } from './components/TaskFormDrawer'
import {
  useTasks,
  useTask,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useToggleTask,
} from '@/features/tasks/hooks'
import { useClients } from '@/features/clients/hooks'
import { matchesTodayFilter, matchesThisWeekFilter } from '@/features/tasks/filters'
import type { Client, Task } from '@/types/database'
import type { TaskFormOutput } from '@/features/tasks/schema'

const VALID_TABS: TaskTab[] = ['all', 'today', 'week']

function parseTab(s: string | null): TaskTab {
  return (VALID_TABS as string[]).includes(s ?? '') ? (s as TaskTab) : 'all'
}

export function TasksPage() {
  const navigate = useNavigate()
  const params = useParams<{ id?: string }>()
  const matchNew = useMatch('/tasks/new')
  const matchEdit = useMatch('/tasks/:id/edit')
  const [searchParams, setSearchParams] = useSearchParams()

  const mode: 'create' | 'edit' | null = matchNew
    ? 'create'
    : matchEdit
      ? 'edit'
      : null
  const drawerOpen = mode !== null
  const editingId = matchEdit ? params.id : undefined

  const tab: TaskTab = parseTab(searchParams.get('tab'))
  const clientFilter: string | null = searchParams.get('client') || null

  const [submitError, setSubmitError] = useState<string | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<Task | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const tasksQuery = useTasks()
  const clientsQuery = useClients()
  const editingTaskQuery = useTask(editingId)
  const createMutation = useCreateTask()
  const updateMutation = useUpdateTask(editingId ?? '')
  const toggleMutation = useToggleTask()
  const deleteMutation = useDeleteTask()

  // Build a quick lookup map for client info needed by TaskRow
  const clientsById = useMemo(() => {
    const map: Record<string, Pick<Client, 'id' | 'first_name' | 'last_name'>> = {}
    for (const c of clientsQuery.data ?? []) {
      map[c.id] = { id: c.id, first_name: c.first_name, last_name: c.last_name }
    }
    return map
  }, [clientsQuery.data])

  // Apply tab + client filter, split active / completed
  const { active, completed } = useMemo(() => {
    const all = tasksQuery.data ?? []
    const filteredByClient = clientFilter
      ? all.filter((t) => t.client_id === clientFilter)
      : all
    const filteredByTab = filteredByClient.filter((t) => {
      if (tab === 'today') return matchesTodayFilter(t)
      if (tab === 'week') return matchesThisWeekFilter(t)
      return true
    })
    const active = filteredByTab.filter((t) => !t.completed)
    const completed = filteredByTab
      .filter((t) => t.completed)
      .sort((a, b) => (a.completed_at ?? '') > (b.completed_at ?? '') ? -1 : 1)
      .slice(0, 30)
    return { active, completed }
  }, [tasksQuery.data, tab, clientFilter])

  function updateSearchParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams)
    if (value === null || value === '') next.delete(key)
    else next.set(key, value)
    setSearchParams(next, { replace: true })
  }

  function closeDrawer() {
    setSubmitError(null)
    // Preserve current search params (filters)
    navigate({ pathname: '/tasks', search: searchParams.toString() })
  }

  async function handleSubmit(values: TaskFormOutput) {
    setSubmitError(null)
    try {
      if (mode === 'create') {
        await createMutation.mutateAsync({ ...values, completed: false })
      } else if (mode === 'edit' && editingId) {
        await updateMutation.mutateAsync(values)
      }
      closeDrawer()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    }
  }

  function handleToggle(id: string, completed: boolean) {
    toggleMutation.mutate({ id, completed })
  }

  function openCreate() {
    const sp = searchParams.toString()
    navigate({ pathname: '/tasks/new', search: sp })
  }

  async function confirmDelete() {
    if (!deleteCandidate) return
    setDeleteError(null)
    try {
      await deleteMutation.mutateAsync(deleteCandidate.id)
      setDeleteCandidate(null)
      // If we were editing the deleted task, close the drawer
      if (mode === 'edit' && editingId === deleteCandidate.id) {
        closeDrawer()
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    }
  }

  // Pre-selected client when opening "/tasks/new?client=<uuid>"
  const preselectedClientId =
    mode === 'create' ? searchParams.get('client') || null : null

  const isLoading = tasksQuery.isLoading || clientsQuery.isLoading
  const isError = tasksQuery.isError
  const submitting = createMutation.isPending || updateMutation.isPending
  const hasAnyTasks = (tasksQuery.data?.length ?? 0) > 0
  const hasAnyResults = active.length + completed.length > 0

  return (
    <>
      <div className="space-y-6">
        <TaskFiltersBar
          tab={tab}
          onTabChange={(t) => updateSearchParam('tab', t === 'all' ? null : t)}
          clientId={clientFilter}
          onClientChange={(id) => updateSearchParam('client', id)}
          clients={clientsQuery.data ?? []}
          onCreate={openCreate}
        />

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" className="text-accent" />
          </div>
        )}

        {isError && (
          <Card className="text-center">
            <p className="text-sm text-danger mb-3">
              Impossible de charger les tâches.
            </p>
            <Button variant="secondary" onClick={() => tasksQuery.refetch()}>
              Réessayer
            </Button>
          </Card>
        )}

        {!isLoading && !isError && !hasAnyTasks && (
          <Card className="text-center py-12">
            <p className="text-sm text-muted mb-4">
              Aucune tâche pour l'instant.
            </p>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Ajouter votre première tâche
            </Button>
          </Card>
        )}

        {!isLoading && !isError && hasAnyTasks && !hasAnyResults && (
          <Card className="text-center">
            <p className="text-sm text-muted">
              Aucune tâche ne correspond à ce filtre.
            </p>
          </Card>
        )}

        {!isLoading && !isError && hasAnyResults && (
          <>
            <TasksList
              tasks={active}
              tab={tab}
              clientsById={clientsById}
              onToggle={handleToggle}
              onDelete={(t) => setDeleteCandidate(t)}
            />
            <CompletedSection
              tasks={completed}
              clientsById={clientsById}
              onToggle={handleToggle}
              onDelete={(t) => setDeleteCandidate(t)}
            />
          </>
        )}
      </div>

      <TaskFormDrawer
        open={drawerOpen}
        mode={mode === 'create' ? 'create' : 'edit'}
        task={editingTaskQuery.data}
        isLoadingTask={mode === 'edit' && editingTaskQuery.isLoading}
        submitting={submitting}
        errorMessage={submitError}
        clients={clientsQuery.data ?? []}
        preselectedClientId={preselectedClientId}
        onClose={closeDrawer}
        onSubmit={handleSubmit}
        onDelete={
          mode === 'edit' && editingTaskQuery.data
            ? () => setDeleteCandidate(editingTaskQuery.data!)
            : undefined
        }
      />

      <ConfirmDialog
        open={deleteCandidate !== null}
        onClose={() => {
          setDeleteCandidate(null)
          setDeleteError(null)
        }}
        onConfirm={confirmDelete}
        title="Supprimer cette tâche ?"
        description={
          deleteCandidate && (
            <>
              <p className="italic">« {deleteCandidate.title} »</p>
              <p className="mt-2">Cette action est définitive.</p>
              {deleteError && <p className="text-danger mt-2">{deleteError}</p>}
            </>
          )
        }
        confirmLabel="Supprimer"
        confirmVariant="danger"
        loading={deleteMutation.isPending}
      />
    </>
  )
}
