import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { Clock, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import { CompleteFollowupPopover } from './CompleteFollowupPopover'
import { usePostponeFollowup, useChangeStage } from '@/features/crm/hooks'
import type { PendingFollowup } from '@/features/crm/api'

interface FollowupRowProps {
  followup: PendingFollowup
  onError: (msg: string | null) => void
}

function relativeFromNow(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now()
  const days = Math.round(ms / 86_400_000)
  if (days < -1) return `il y a ${-days} jours`
  if (days === -1) return `hier`
  if (days === 0) return `aujourd'hui`
  if (days === 1) return `demain`
  return `dans ${days} jours`
}

export function FollowupRow({ followup, onError }: FollowupRowProps) {
  const postponeMutation = usePostponeFollowup()
  const changeStageMutation = useChangeStage()
  const busyRef = useRef(false)

  function handlePostpone() {
    if (busyRef.current) return
    busyRef.current = true
    onError(null)
    postponeMutation.mutate(followup.id, {
      onError: err => onError(err instanceof Error ? err.message : 'Erreur'),
      onSettled: () => { busyRef.current = false },
    })
  }

  function handleReplied() {
    if (busyRef.current) return
    busyRef.current = true
    onError(null)
    changeStageMutation.mutate(
      { contactId: followup.contact.id, newStage: 'replied' },
      {
        onError: err => onError(err instanceof Error ? err.message : 'Erreur'),
        onSettled: () => { busyRef.current = false },
      },
    )
  }

  const isProspectFollowup = followup.type === 'prospect_followup'
  const typeLabel = isProspectFollowup
    ? `Relance prospect${followup.followup_index ? ` #${followup.followup_index}` : ''}`
    : 'Relance conversation'

  const contactName = `${followup.contact.first_name} ${followup.contact.last_name}`.trim()
  const subline = [followup.contact.company].filter(Boolean).join(' · ')
  const anyBusy = postponeMutation.isPending || changeStageMutation.isPending

  return (
    <div className={cn(
      'rounded-xl border border-border bg-surface px-3 py-3 shadow-card',
      'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
    )}>
      <div className="min-w-0 flex-1">
        <Link to={`/crm/contacts/${followup.contact.id}`} className="font-semibold text-sm hover:text-accent break-words">
          {contactName}
        </Link>
        <div className="text-xs text-muted">{typeLabel}{subline ? ` · ${subline}` : ''}</div>
        <div className="text-xs text-muted mt-0.5">{relativeFromNow(followup.scheduled_at)}</div>
      </div>
      <div className="flex flex-wrap gap-2 sm:flex-nowrap">
        <Button
          variant="ghost"
          onClick={handlePostpone}
          disabled={anyBusy}
          className="min-h-[44px]"
        >
          {postponeMutation.isPending ? <Spinner size="sm" /> : <><Clock size={14} className="mr-1" /> Reporter</>}
        </Button>
        {isProspectFollowup && (
          <Button
            variant="ghost"
            onClick={handleReplied}
            disabled={anyBusy}
            className="min-h-[44px] text-success hover:text-success"
            title="Le prospect a répondu — bascule en A répondu"
          >
            {changeStageMutation.isPending
              ? <Spinner size="sm" />
              : <><MessageCircle size={14} className="mr-1" /> A répondu</>}
          </Button>
        )}
        <CompleteFollowupPopover followupId={followup.id} onError={onError} />
      </div>
    </div>
  )
}
