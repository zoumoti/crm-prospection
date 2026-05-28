import { useRef } from 'react'
import { Check, Clock, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import { useFollowupsForContact, useCompleteFollowup } from '@/features/crm/hooks'
import type { Followup } from '@/types/database'

interface ContactFollowupsSectionProps {
  contactId: string
  onError: (msg: string | null) => void
}

function formatDateFr(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

function followupLabel(f: Followup): string {
  if (f.type === 'prospect_followup') {
    return `Relance prospect${f.followup_index ? ` #${f.followup_index}` : ''}`
  }
  return 'Relance conversation'
}

export function ContactFollowupsSection({ contactId, onError }: ContactFollowupsSectionProps) {
  const query = useFollowupsForContact(contactId)
  const completeMutation = useCompleteFollowup()
  const busyRef = useRef<Record<string, boolean>>({})

  function handleFait(f: Followup) {
    if (busyRef.current[f.id]) return
    busyRef.current[f.id] = true
    onError(null)
    completeMutation.mutate(
      { followupId: f.id },
      {
        onError: err => onError(err instanceof Error ? err.message : 'Erreur'),
        onSettled: () => { busyRef.current[f.id] = false },
      },
    )
  }

  if (query.isLoading) {
    return (
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-center py-6">
          <Spinner className="text-accent" />
        </div>
      </Card>
    )
  }
  if (query.isError) {
    return <Card className="p-4 sm:p-6"><p className="text-sm text-danger">Erreur de chargement</p></Card>
  }
  const all = query.data ?? []
  const pending = all.filter(f => f.status === 'pending')
  const done = all.filter(f => f.status === 'done')
  const cancelled = all.filter(f => f.status === 'cancelled')

  return (
    <Card className="p-4 sm:p-6">
      <h2 className="text-base sm:text-lg font-semibold mb-4">Relances</h2>

      {all.length === 0 ? (
        <p className="text-sm text-muted">Aucune relance pour ce prospect.</p>
      ) : (
        <div className="space-y-4">
          {pending.length > 0 && (
            <Group title="En cours" icon={Clock} iconClass="text-warning">
              {pending.map(f => (
                <Row key={f.id} f={f}>
                  <Button onClick={() => handleFait(f)} disabled={completeMutation.isPending}>
                    <Check size={14} className="mr-1" /> Fait
                  </Button>
                </Row>
              ))}
            </Group>
          )}
          {done.length > 0 && (
            <Group title="Terminées" icon={Check} iconClass="text-success">
              {done.map(f => <Row key={f.id} f={f} muted />)}
            </Group>
          )}
          {cancelled.length > 0 && (
            <Group title="Annulées" icon={X} iconClass="text-muted">
              {cancelled.map(f => <Row key={f.id} f={f} muted />)}
            </Group>
          )}
        </div>
      )}
    </Card>
  )
}

function Group({ title, icon: Icon, iconClass, children }: {
  title: string
  icon: typeof Check
  iconClass: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted mb-2">
        <Icon size={14} className={iconClass} aria-hidden /> {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Row({ f, muted, children }: { f: Followup; muted?: boolean; children?: React.ReactNode }) {
  return (
    <div className={cn(
      'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg p-3 border',
      muted ? 'border-border bg-surface/50' : 'border-warning/30 bg-warning-soft',
    )}>
      <div>
        <div className="text-sm font-medium">{followupLabel(f)}</div>
        <div className="text-xs text-muted">Prévue le {formatDateFr(f.scheduled_at)}</div>
        {f.note && <div className="text-xs text-muted mt-1 italic">« {f.note} »</div>}
      </div>
      {children}
    </div>
  )
}
