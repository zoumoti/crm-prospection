import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Plus } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { TaskRow } from '@/pages/tasks/components/TaskRow'
import { useTasksForClient, useToggleTask, useDeleteTask } from '@/features/tasks/hooks'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useState } from 'react'
import { sortActive } from '@/features/tasks/filters'
import type { Task } from '@/types/database'

interface ClientTasksCardProps {
  clientId: string
  clientFirstName: string
  clientLastName: string
}

export function ClientTasksCard({
  clientId,
  clientFirstName,
  clientLastName,
}: ClientTasksCardProps) {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useTasksForClient(clientId)
  const toggleMutation = useToggleTask()
  const deleteMutation = useDeleteTask()
  const [deleteCandidate, setDeleteCandidate] = useState<Task | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const client = {
    id: clientId,
    first_name: clientFirstName,
    last_name: clientLastName,
  }

  const tasks = data ?? []
  const sorted = sortActive(tasks)
  const visible = sorted.slice(0, 5)
  const total = sorted.length

  function handleToggle(id: string, completed: boolean) {
    toggleMutation.mutate({ id, completed })
  }

  async function confirmDelete() {
    if (!deleteCandidate) return
    setDeleteError(null)
    try {
      await deleteMutation.mutateAsync(deleteCandidate.id)
      setDeleteCandidate(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold tracking-wider text-muted uppercase">
          Tâches liées
        </h3>
        <Button
          variant="ghost"
          onClick={() => navigate(`/tasks/new?client=${clientId}`)}
        >
          <Plus className="h-4 w-4" />
          Ajouter une tâche
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-6">
          <Spinner className="text-accent" />
        </div>
      )}

      {isError && (
        <div className="text-sm text-danger flex items-center justify-between">
          <span>Impossible de charger les tâches.</span>
          <Button variant="ghost" onClick={() => refetch()}>
            Réessayer
          </Button>
        </div>
      )}

      {!isLoading && !isError && total === 0 && (
        <p className="text-sm text-muted py-2">Aucune tâche pour ce client.</p>
      )}

      {!isLoading && !isError && total > 0 && (
        <div className="space-y-2">
          {visible.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              client={client}
              onToggle={handleToggle}
              onDelete={(t) => setDeleteCandidate(t)}
            />
          ))}
        </div>
      )}

      {total > 0 && (
        <div className="mt-3 text-right">
          <Link
            to={`/tasks?client=${clientId}`}
            className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
          >
            Voir toutes les tâches ({total})
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

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
    </Card>
  )
}
