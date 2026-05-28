import { useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import { useCreateNote } from '@/features/crm/hooks'

interface AddNoteInputProps {
  contactId: string
}

export function AddNoteInput({ contactId }: AddNoteInputProps) {
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const busyRef = useRef(false)
  const createMutation = useCreateNote(contactId)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (busyRef.current) return
    const trimmed = body.trim()
    if (!trimmed) return
    busyRef.current = true
    setError(null)
    createMutation.mutate(trimmed, {
      onSuccess: () => setBody(''),
      onError: err => setError(err instanceof Error ? err.message : 'Erreur'),
      onSettled: () => { busyRef.current = false },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Ajouter une note…"
        rows={2}
        className={cn(
          'w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted',
          'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20',
        )}
        aria-label="Ajouter une note"
      />
      {error && <div className="text-xs text-danger" role="alert">{error}</div>}
      <div className="flex justify-end">
        <Button type="submit" disabled={createMutation.isPending || body.trim().length === 0}>
          {createMutation.isPending ? <Spinner size="sm" /> : 'Enregistrer la note'}
        </Button>
      </div>
    </form>
  )
}
