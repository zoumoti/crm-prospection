import { useState, useRef } from 'react'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { cn } from '@/lib/utils'
import { AddNoteInput } from './AddNoteInput'
import { useInteractions, useUpdateNote, useDeleteNote } from '@/features/crm/hooks'
import type { Interaction } from '@/types/database'

interface ContactNotesSectionProps {
  contactId: string
}

function formatRelative(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

function getBody(i: Interaction): string {
  return typeof i.payload.body === 'string' ? i.payload.body : ''
}

export function ContactNotesSection({ contactId }: ContactNotesSectionProps) {
  const query = useInteractions(contactId)
  const updateMutation = useUpdateNote(contactId)
  const deleteMutation = useDeleteNote(contactId)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')
  const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const busyRef = useRef(false)

  const notes = (query.data ?? []).filter(i => i.type === 'note')

  function startEdit(i: Interaction) {
    setEditingId(i.id)
    setEditBody(getBody(i))
    setError(null)
  }
  function cancelEdit() {
    setEditingId(null); setEditBody(''); setError(null)
  }
  function saveEdit() {
    if (busyRef.current || !editingId) return
    const body = editBody.trim()
    if (!body) { setError('La note ne peut être vide.'); return }
    busyRef.current = true
    updateMutation.mutate(
      { id: editingId, body },
      {
        onSuccess: () => { cancelEdit() },
        onError: err => setError(err instanceof Error ? err.message : 'Erreur'),
        onSettled: () => { busyRef.current = false },
      },
    )
  }
  function confirmDelete() {
    if (busyRef.current || !deleteCandidate) return
    busyRef.current = true
    deleteMutation.mutate(deleteCandidate, {
      onSuccess: () => setDeleteCandidate(null),
      onError: err => setError(err instanceof Error ? err.message : 'Erreur suppression'),
      onSettled: () => { busyRef.current = false },
    })
  }

  return (
    <Card className="p-4 sm:p-6">
      <h2 className="text-base sm:text-lg font-semibold mb-4">Notes</h2>

      <div className="mb-6">
        <AddNoteInput contactId={contactId} />
      </div>

      {error && <div className="text-sm text-danger mb-3" role="alert">{error}</div>}

      {query.isLoading ? (
        <div className="flex items-center justify-center py-6"><Spinner className="text-accent" /></div>
      ) : query.isError ? (
        <p className="text-sm text-danger">Erreur de chargement</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted">Aucune note pour l'instant.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map(i => {
            const isEditingThis = editingId === i.id
            return (
              <li key={i.id} className="bg-bg rounded-lg px-3 py-2 border border-border/50">
                {isEditingThis ? (
                  <div className="space-y-2">
                    <textarea
                      value={editBody}
                      onChange={e => setEditBody(e.target.value)}
                      rows={3}
                      className={cn(
                        'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text',
                        'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20',
                      )}
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" onClick={cancelEdit}>Annuler</Button>
                      <Button onClick={saveEdit} disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? <Spinner size="sm" /> : 'Enregistrer'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 items-start">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-text whitespace-pre-wrap">{getBody(i)}</div>
                      <div className="text-xs text-muted mt-1">{formatRelative(i.created_at)}</div>
                    </div>
                    <NoteActions
                      onEdit={() => startEdit(i)}
                      onDelete={() => { setDeleteCandidate(i.id); setError(null) }}
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog
        open={deleteCandidate !== null}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={confirmDelete}
        title="Supprimer cette note ?"
        description="Cette action est définitive."
        confirmLabel="Supprimer"
        confirmVariant="danger"
      />
    </Card>
  )
}

function NoteActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="p-2 rounded-md hover:bg-surface text-muted hover:text-text min-h-[44px] min-w-[44px]"
        aria-label="Actions de la note"
      >
        <MoreVertical size={16} aria-hidden />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-card p-1 z-40 min-w-[140px]">
            <button
              type="button"
              onClick={() => { setOpen(false); onEdit() }}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-bg text-text"
            >
              <Pencil size={14} aria-hidden /> Modifier
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); onDelete() }}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-bg text-danger"
            >
              <Trash2 size={14} aria-hidden /> Supprimer
            </button>
          </div>
        </>
      )}
    </div>
  )
}
