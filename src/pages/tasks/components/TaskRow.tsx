import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flag, MoreHorizontal, Pencil, Trash2, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTaskDue, isOverdue } from '@/features/tasks/filters'
import type { Task } from '@/types/database'

interface ClientMini {
  id: string
  first_name: string
  last_name: string
}

interface TaskRowProps {
  task: Task
  client?: ClientMini | null
  onToggle: (id: string, completed: boolean) => void
  onDelete: (task: Task) => void
}

export function TaskRow({ task, client, onToggle, onDelete }: TaskRowProps) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  const overdue = !task.completed && isOverdue(task)
  const dueLabel = formatTaskDue(task.due_date)

  function openEdit() {
    navigate(`/tasks/${task.id}/edit`)
  }

  function handleRowClick(e: React.MouseEvent) {
    // Don't navigate when interacting with checkbox or menu
    const target = e.target as HTMLElement
    if (target.closest('[data-row-no-nav]')) return
    openEdit()
  }

  return (
    <div
      onClick={handleRowClick}
      className={cn(
        'group flex items-center gap-3 px-4 py-3 bg-surface rounded-xl border border-border/40 hover:bg-bg cursor-pointer transition',
        task.completed && 'opacity-60'
      )}
    >
      <button
        data-row-no-nav
        onClick={(e) => {
          e.stopPropagation()
          onToggle(task.id, !task.completed)
        }}
        aria-label={task.completed ? 'Décocher' : 'Marquer comme fait'}
        className={cn(
          'h-5 w-5 shrink-0 rounded-md border-2 flex items-center justify-center transition',
          task.completed
            ? 'bg-accent border-accent text-white'
            : 'border-border hover:border-accent'
        )}
      >
        {task.completed && (
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 8 L7 12 L13 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              'text-sm font-medium text-text',
              task.completed && 'line-through'
            )}
          >
            {task.title}
          </span>
          {client && task.assignee === 'owner' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-bg text-muted">
              {client.first_name} {client.last_name}
            </span>
          )}
          {client && task.assignee === 'client' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent-soft text-accent inline-flex items-center gap-1">
              <User className="h-3 w-3" />
              {client.first_name} {client.last_name}
            </span>
          )}
        </div>
        {task.notes && (
          <p className="text-xs text-muted mt-1 truncate">{task.notes}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {dueLabel && (
          <span
            className={cn(
              'text-xs',
              overdue ? 'text-danger font-medium' : 'text-muted'
            )}
          >
            {dueLabel}
          </span>
        )}
        {task.priority === 'high' && (
          <Flag className="h-4 w-4 text-danger fill-current" />
        )}
        {task.priority === 'low' && (
          <Flag className="h-4 w-4 text-muted opacity-40" />
        )}
        <div ref={menuRef} className="relative" data-row-no-nav>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen((o) => !o)
            }}
            aria-label="Plus d'actions"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted hover:bg-border/40 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-44 rounded-xl bg-surface border border-border shadow-card p-1 z-30">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  openEdit()
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text hover:bg-bg transition"
              >
                <Pencil className="h-4 w-4" />
                Modifier
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  onDelete(task)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-danger hover:bg-danger/10 transition"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
