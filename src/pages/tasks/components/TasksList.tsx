import { TaskRow } from './TaskRow'
import { hasNoDueDate, isDueToday, isOverdue, isUpcoming } from '@/features/tasks/filters'
import type { Client, Task } from '@/types/database'
import type { TaskTab } from './TaskFiltersBar'

interface TasksListProps {
  tasks: Task[]
  tab: TaskTab
  clientsById: Record<string, Pick<Client, 'id' | 'first_name' | 'last_name'>>
  onToggle: (id: string, completed: boolean) => void
  onDelete: (task: Task) => void
}

function Section({
  title,
  tasks,
  variant = 'default',
  clientsById,
  onToggle,
  onDelete,
}: {
  title: string
  tasks: Task[]
  variant?: 'default' | 'danger' | 'client'
  clientsById: Record<string, Pick<Client, 'id' | 'first_name' | 'last_name'>>
  onToggle: (id: string, completed: boolean) => void
  onDelete: (task: Task) => void
}) {
  if (tasks.length === 0) return null
  return (
    <div className="space-y-2">
      <h3
        className={
          variant === 'danger'
            ? 'text-xs font-semibold tracking-wider uppercase text-danger'
            : variant === 'client'
              ? 'text-xs font-semibold tracking-wider uppercase text-accent'
              : 'text-xs font-semibold tracking-wider uppercase text-muted'
        }
      >
        {title} ({tasks.length})
      </h3>
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            client={task.client_id ? clientsById[task.client_id] ?? null : null}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  )
}

export function TasksList({ tasks, tab, clientsById, onToggle, onDelete }: TasksListProps) {
  const ownerTasks = tasks.filter((t) => t.assignee === 'owner')
  const clientTasks = tasks.filter((t) => t.assignee === 'client')

  const overdue = ownerTasks.filter((t) => isOverdue(t))
  const today = ownerTasks.filter((t) => isDueToday(t))
  const upcoming = ownerTasks.filter((t) => isUpcoming(t))
  const noDate = ownerTasks.filter((t) => hasNoDueDate(t))

  return (
    <div className="space-y-6">
      <Section
        title="En retard"
        tasks={overdue}
        variant="danger"
        clientsById={clientsById}
        onToggle={onToggle}
        onDelete={onDelete}
      />
      {(tab === 'all' || tab === 'today' || tab === 'week') && (
        <Section
          title="Aujourd'hui"
          tasks={today}
          clientsById={clientsById}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      )}
      {(tab === 'all' || tab === 'week') && (
        <Section
          title="À venir"
          tasks={upcoming}
          clientsById={clientsById}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      )}
      {tab === 'all' && (
        <Section
          title="Sans échéance"
          tasks={noDate}
          clientsById={clientsById}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      )}
      <Section
        title="Pour le client"
        tasks={clientTasks}
        variant="client"
        clientsById={clientsById}
        onToggle={onToggle}
        onDelete={onDelete}
      />
    </div>
  )
}
