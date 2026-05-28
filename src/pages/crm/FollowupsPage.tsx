import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { endOfDay } from 'date-fns'
import { AlertCircle, Calendar, Clock, HelpCircle, MessageSquare } from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import { FollowupRow } from './components/FollowupRow'
import { AwaitingDecisionRow } from './components/AwaitingDecisionRow'
import { usePendingFollowups, useAwaitingDecisionContacts } from '@/features/crm/hooks'
import { bucketize, type FollowupBucket } from '@/features/crm/followup-buckets'

type TabId = FollowupBucket | 'conversation' | 'awaiting'

interface TabDef {
  id: TabId
  label: string
  icon: typeof AlertCircle
  /** Tailwind background tint for the active tab. */
  tone: string
}
const TABS: TabDef[] = [
  { id: 'overdue',      label: 'En retard',         icon: AlertCircle,   tone: 'bg-danger/10 text-danger' },
  { id: 'today',        label: "Aujourd'hui",       icon: Clock,         tone: 'bg-warning-soft text-warning' },
  { id: 'upcoming',     label: 'À venir',           icon: Calendar,      tone: 'bg-muted-soft text-muted' },
  { id: 'conversation', label: 'Suivi conversation', icon: MessageSquare, tone: 'bg-accent-soft text-success' },
  { id: 'awaiting',     label: 'Fin de relance',    icon: HelpCircle,    tone: 'bg-purple-soft text-purple' },
]

function parseTab(s: string | null): TabId {
  if (s === 'overdue' || s === 'today' || s === 'upcoming' || s === 'conversation' || s === 'awaiting') return s
  return 'today'
}

export function FollowupsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: TabId = parseTab(searchParams.get('bucket'))
  const [error, setError] = useState<string | null>(null)

  const pendingQuery = usePendingFollowups()
  const awaitingQuery = useAwaitingDecisionContacts()

  // Split pending followups by type. The 3 time-based tabs (overdue/today/upcoming)
  // only show prospect_followups — the chase workflow. conversation_followups
  // live in their own tab, filtered to "due now" (overdue + today) so that
  // marking a check-up Fait makes it disappear from view; the auto-created
  // next check-up at +N days stays silently queued and reappears on its day.
  const { prospectFollowups, conversationFollowupsDue } = useMemo(() => {
    const all = pendingQuery.data ?? []
    const prospect = all.filter(f => f.type === 'prospect_followup')
    const todayEnd = endOfDay(new Date())
    const conversationDue = all
      .filter(f => f.type === 'conversation_followup')
      .filter(f => new Date(f.scheduled_at) <= todayEnd)
    return {
      prospectFollowups: prospect,
      conversationFollowupsDue: conversationDue,
    }
  }, [pendingQuery.data])

  const buckets = useMemo(() => bucketize(prospectFollowups), [prospectFollowups])

  function selectTab(t: TabId) {
    const next = new URLSearchParams(searchParams)
    next.set('bucket', t)
    setSearchParams(next)
  }

  const awaitingCount = (awaitingQuery.data ?? []).length

  function countForTab(id: TabId): number {
    if (id === 'awaiting') return awaitingCount
    if (id === 'conversation') return conversationFollowupsDue.length
    return buckets[id].length
  }

  const isLoading = tab === 'awaiting' ? awaitingQuery.isLoading : pendingQuery.isLoading
  const isError   = tab === 'awaiting' ? awaitingQuery.isError   : pendingQuery.isError

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl sm:text-2xl font-semibold">Relances</h1>
        <p className="text-sm text-muted">
          {prospectFollowups.length} relance{prospectFollowups.length > 1 ? 's' : ''} prospect
          {conversationFollowupsDue.length > 0 ? ` · ${conversationFollowupsDue.length} suivi conversation à check` : ''}
          {awaitingCount > 0 ? ` · ${awaitingCount} en fin de cycle` : ''}
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {TABS.map(t => {
          const count = countForTab(t.id)
          const active = tab === t.id
          const Icon = t.icon
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTab(t.id)}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border min-h-[44px]',
                active
                  ? cn(t.tone, 'border-transparent')
                  : 'bg-surface text-muted border-border hover:text-text',
              )}
              aria-pressed={active}
            >
              <Icon size={14} aria-hidden /> {t.label}
              <span className="opacity-60 text-xs">({count})</span>
            </button>
          )
        })}
      </div>

      {error && (
        <div className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2" role="alert">{error}</div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Spinner size="lg" className="text-accent" /></div>
      ) : isError ? (
        <p className="text-sm text-danger">Erreur de chargement.</p>
      ) : tab === 'awaiting' ? (
        (awaitingQuery.data ?? []).length === 0 ? (
          <div className="text-center text-sm text-muted py-12">
            Aucun prospect en attente de décision.<br />
            <span className="text-xs">
              Cet onglet liste les prospects dont la dernière relance a été marquée Fait sans réponse.
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            {(awaitingQuery.data ?? []).map(c => (
              <AwaitingDecisionRow key={c.id} contact={c} onError={setError} />
            ))}
          </div>
        )
      ) : tab === 'conversation' ? (
        conversationFollowupsDue.length === 0 ? (
          <div className="text-center text-sm text-muted py-12">
            Aucun suivi de conversation à checker aujourd'hui.<br />
            <span className="text-xs">
              Quand un prospect passe en « A répondu », un check-up se crée automatiquement
              à la cadence configurée dans Paramètres &gt; Prospection. Les check-ups
              futures sont masquées tant que leur date n'est pas arrivée.
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            {conversationFollowupsDue.map(f => (
              <FollowupRow key={f.id} followup={f} onError={setError} />
            ))}
          </div>
        )
      ) : buckets[tab].length === 0 ? (
        <div className="text-center text-sm text-muted py-12">
          Aucune relance dans ce bucket.
        </div>
      ) : (
        <div className="space-y-2">
          {buckets[tab].map(f => <FollowupRow key={f.id} followup={f} onError={setError} />)}
        </div>
      )}
    </div>
  )
}
