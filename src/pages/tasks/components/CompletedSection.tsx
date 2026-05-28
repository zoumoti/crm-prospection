import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TaskRow } from './TaskRow'
import type { Client, Task } from '@/types/database'

const STORAGE_KEY = 'tasks_completed_expanded'

interface CompletedSectionProps {
  tasks: Task[]
  clientsById: Record<string, Pick<Client, 'id' | 'first_name' | 'last_name'>>
  onToggle: (id: string, completed: boolean) => void
  onDelete: (task: Task) => void
}

export function CompletedSection({
  tasks,
  clientsById,
  onToggle,
  onDelete,
}: CompletedSectionProps) {
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'true') setExpanded(true)
    } catch {
      // localStorage may be unavailable (private mode, etc.) — fall back to closed
    }
  }, [])

  function toggle() {
    setExpanded((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, String(next))
      } catch {
        // best-effort
      }
      return next
    })
  }

  if (tasks.length === 0) return null

  return (
    <div className="mt-6">
      <button
        onClick={toggle}
        className="flex items-center gap-2 text-sm font-medium text-muted hover:text-text transition"
      >
        <ChevronRight
          className={cn('h-4 w-4 transition-transform', expanded && 'rotate-90')}
        />
        Complétées ({tasks.length})
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
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
      )}
    </div>
  )
}
