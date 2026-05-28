import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from './api'
import type { Task, TaskInsert, TaskUpdate } from '@/types/database'

const KEY = ['tasks'] as const

export function useTasks() {
  return useQuery({ queryKey: KEY, queryFn: api.listTasks })
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => api.getTask(id!),
    enabled: !!id,
  })
}

export function useTasksForClient(clientId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'forClient', clientId],
    queryFn: () => api.listTasksForClient(clientId!),
    enabled: !!clientId,
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<TaskInsert, 'owner_id'>) => api.createTask(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateTask(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: TaskUpdate) => api.updateTask(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, id] })
    },
  })
}

/**
 * Optimistic toggle of `completed`. Snapshots the current cache, patches
 * it instantly, rolls back if the server rejects.
 */
export function useToggleTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      api.toggleTask(id, completed, 'owner'),
    onMutate: async ({ id, completed }) => {
      await qc.cancelQueries({ queryKey: KEY })
      const previous = qc.getQueryData<Task[]>(KEY)
      if (previous) {
        qc.setQueryData<Task[]>(
          KEY,
          previous.map((t) =>
            t.id === id
              ? {
                  ...t,
                  completed,
                  completed_at: completed ? new Date().toISOString() : null,
                  completed_by: completed ? 'owner' : null,
                }
              : t
          )
        )
      }
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(KEY, ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
