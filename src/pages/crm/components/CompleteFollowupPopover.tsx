import { useState, useRef } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import { useCompleteFollowup } from '@/features/crm/hooks'

interface CompleteFollowupPopoverProps {
  followupId: string
  onError: (msg: string | null) => void
}

export function CompleteFollowupPopover({ followupId, onError }: CompleteFollowupPopoverProps) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const busyRef = useRef(false)
  const mutation = useCompleteFollowup()

  function handleConfirm() {
    if (busyRef.current) return
    busyRef.current = true
    onError(null)
    mutation.mutate(
      { followupId, note: note.trim() || null },
      {
        onSuccess: () => { setOpen(false); setNote('') },
        onError: err => { onError(err instanceof Error ? err.message : 'Erreur'); setOpen(false) },
        onSettled: () => { busyRef.current = false },
      },
    )
  }

  return (
    <div className="relative">
      <Button onClick={() => setOpen(o => !o)} className="min-h-[44px]">
        <Check size={14} className="mr-1" /> Fait
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full mt-2 bg-surface border border-border rounded-xl shadow-card p-3 z-40 w-72">
            <label htmlFor={`note-${followupId}`} className="block text-xs uppercase tracking-wider text-muted mb-1">
              Note (optionnelle)
            </label>
            <textarea
              id={`note-${followupId}`}
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="Ex: pas de réponse, à recontacter plus tard…"
              className={cn(
                'w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text placeholder:text-muted',
                'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20',
              )}
            />
            <div className="flex gap-2 justify-end mt-2">
              <Button variant="ghost" onClick={() => { setOpen(false); setNote('') }}>Annuler</Button>
              <Button onClick={handleConfirm} disabled={mutation.isPending}>
                {mutation.isPending ? <Spinner size="sm" /> : 'Confirmer'}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
