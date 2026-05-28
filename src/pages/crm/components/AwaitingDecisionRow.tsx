import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import { useChangeStage } from '@/features/crm/hooks'
import type { AwaitingContact } from '@/features/crm/api'

interface AwaitingDecisionRowProps {
  contact: AwaitingContact
  onError: (msg: string | null) => void
}

function relativeFromNow(iso: string | null): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  const days = Math.round(ms / 86_400_000)
  if (days < 1) return "aujourd'hui"
  if (days === 1) return 'hier'
  return `il y a ${days} jours`
}

export function AwaitingDecisionRow({ contact, onError }: AwaitingDecisionRowProps) {
  const changeStageMutation = useChangeStage()
  const busyRef = useRef(false)

  function handleDecision(target: 'replied' | 'closed_lost') {
    if (busyRef.current) return
    busyRef.current = true
    onError(null)
    changeStageMutation.mutate(
      { contactId: contact.id, newStage: target },
      {
        onError: err => onError(err instanceof Error ? err.message : 'Erreur'),
        onSettled: () => { busyRef.current = false },
      },
    )
  }

  const fullName = `${contact.first_name} ${contact.last_name}`.trim()
  const subline = [contact.company, contact.niche].filter(Boolean).join(' · ')
  const doneLine = `${contact.followups_done_count} relance${contact.followups_done_count > 1 ? 's' : ''} sans réponse${
    contact.last_followup_done_at ? ` · dernière ${relativeFromNow(contact.last_followup_done_at)}` : ''
  }`

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-surface px-3 py-3 shadow-card',
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
      )}
    >
      <div className="min-w-0 flex-1">
        <Link
          to={`/crm/contacts/${contact.id}`}
          className="font-semibold text-sm hover:text-accent break-words"
        >
          {fullName}
        </Link>
        {subline && <div className="text-xs text-muted">{subline}</div>}
        <div className="text-xs text-muted mt-0.5">{doneLine}</div>
      </div>
      <div className="flex flex-wrap gap-2 sm:flex-nowrap">
        <Button
          variant="ghost"
          onClick={() => handleDecision('closed_lost')}
          disabled={changeStageMutation.isPending}
          className="min-h-[44px]"
        >
          {changeStageMutation.isPending
            ? <Spinner size="sm" />
            : <><X size={14} className="mr-1" /> Abandonner</>}
        </Button>
        <Button
          onClick={() => handleDecision('replied')}
          disabled={changeStageMutation.isPending}
          className="min-h-[44px]"
        >
          {changeStageMutation.isPending
            ? <Spinner size="sm" />
            : <><Check size={14} className="mr-1" /> A répondu</>}
        </Button>
      </div>
    </div>
  )
}
