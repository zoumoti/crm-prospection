import {
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Task, TaskPriority } from '@/types/database'

// =====================================================================
// Section predicates — used to group active tasks into sections
// =====================================================================

export function isOverdue(task: Task, now: Date = new Date()): boolean {
  if (!task.due_date) return false
  return isBefore(parseISO(task.due_date), startOfDay(now))
}

export function isDueToday(task: Task, now: Date = new Date()): boolean {
  if (!task.due_date) return false
  return isSameDay(parseISO(task.due_date), now)
}

export function isUpcoming(task: Task, now: Date = new Date()): boolean {
  if (!task.due_date) return false
  return isAfter(parseISO(task.due_date), startOfDay(now)) && !isSameDay(parseISO(task.due_date), now)
}

export function hasNoDueDate(task: Task): boolean {
  return task.due_date === null
}

// =====================================================================
// Filter-tab matchers — "does this task belong on this tab?"
// =====================================================================

export function matchesTodayFilter(task: Task, now: Date = new Date()): boolean {
  // "Aujourd'hui" = today + everything overdue
  if (!task.due_date) return false
  return isOverdue(task, now) || isDueToday(task, now)
}

export function matchesThisWeekFilter(task: Task, now: Date = new Date()): boolean {
  // "Cette semaine" = today + overdue + the rest of the current week (up to Sunday)
  if (!task.due_date) return false
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
  const d = parseISO(task.due_date)
  return isBefore(d, weekEnd) || isSameDay(d, weekEnd)
}

// =====================================================================
// Sort — due_date asc (nulls last), priority H>N>L, created_at desc
// =====================================================================

const PRIORITY_RANK: Record<TaskPriority, number> = {
  high: 0,
  normal: 1,
  low: 2,
}

export function sortActive(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.due_date && b.due_date) {
      if (a.due_date !== b.due_date) return a.due_date < b.due_date ? -1 : 1
    } else if (a.due_date) return -1
    else if (b.due_date) return 1
    const p = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    if (p !== 0) return p
    return a.created_at > b.created_at ? -1 : 1
  })
}

// =====================================================================
// Display helper for the due-date pill
// =====================================================================

/**
 * Returns a relative French label for the task's due date.
 *  - null due_date → null
 *  - today        → "Aujourd'hui"
 *  - tomorrow     → "Demain"
 *  - within this week (after today, ≤ end-of-week) → "Mer 14 mai"
 *  - else (past or far future) → "14 mai 2026"
 */
export function formatTaskDue(iso: string | null, now: Date = new Date()): string | null {
  if (!iso) return null
  const d = parseISO(iso)
  const today = startOfDay(now)
  if (isSameDay(d, today)) return "Aujourd'hui"
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (isSameDay(d, tomorrow)) return 'Demain'
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
  if (isAfter(d, today) && (isBefore(d, weekEnd) || isSameDay(d, weekEnd))) {
    return format(d, 'EEE d MMM', { locale: fr })
  }
  return format(d, 'd MMM yyyy', { locale: fr })
}
