import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Archive, UserPlus } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { cn } from '@/lib/utils'
import { STAGES, getStage } from '@/features/crm/stages'
import { useArchiveContact, useChangeStage } from '@/features/crm/hooks'
import type { Contact, ContactStage } from '@/types/database'

interface ContactHeaderProps {
  contact: Contact
  onError: (msg: string | null) => void
  /** Hide the "Retour au pipeline" button when rendered inside a Drawer (the X already closes the view). */
  hideBackButton?: boolean
}

export function ContactHeader({ contact, onError, hideBackButton = false }: ContactHeaderProps) {
  const navigate = useNavigate()
  const [confirmArchive, setConfirmArchive] = useState(false)
  const stageBusyRef = useRef(false)
  const archiveBusyRef = useRef(false)

  const stage = getStage(contact.stage)
  const archiveMutation = useArchiveContact()
  const changeStageMutation = useChangeStage()

  function handleStageChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (stageBusyRef.current) return
    const next = e.target.value as ContactStage
    if (next === contact.stage) return
    stageBusyRef.current = true
    onError(null)
    changeStageMutation.mutate(
      { contactId: contact.id, newStage: next },
      {
        onError: err => onError(err instanceof Error ? err.message : 'Erreur'),
        onSettled: () => { stageBusyRef.current = false },
      },
    )
  }

  function handleArchive() {
    if (archiveBusyRef.current) return
    archiveBusyRef.current = true
    archiveMutation.mutate(contact.id, {
      onSuccess: () => navigate('/crm/pipeline'),
      onError: err => onError(err instanceof Error ? err.message : 'Erreur archivage'),
      onSettled: () => { archiveBusyRef.current = false },
    })
  }

  function handleCreateClient() {
    navigate('/clients/new', {
      state: {
        prefillFromContact: {
          first_name: contact.first_name,
          last_name: contact.last_name,
          company: contact.company,
          email: contact.email,
          phone: contact.phone,
          instagram: contact.source === 'instagram' ? contact.source_url : null,
          linkedin:  contact.source === 'linkedin'  ? contact.source_url : null,
          tiktok:    contact.source === 'tiktok'    ? contact.source_url : null,
        },
      },
    })
  }

  return (
    <div className="space-y-3">
      {!hideBackButton && (
        <button
          type="button"
          onClick={() => navigate('/crm/pipeline')}
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-text min-h-[44px]"
        >
          <ArrowLeft size={16} aria-hidden /> Retour au pipeline
        </button>
      )}

      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text break-words">
            {contact.first_name} {contact.last_name}
          </h1>
          {(contact.company || contact.niche) && (
            <p className="text-sm text-muted break-words">
              {[contact.company, contact.niche].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium shrink-0', stage.bg, stage.text)}>
              {stage.label}
            </span>
            <select
              value={contact.stage}
              onChange={handleStageChange}
              disabled={changeStageMutation.isPending}
              className={cn(
                'flex-1 min-w-0 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text min-h-[44px]',
                'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20',
              )}
              aria-label="Changer le stage"
            >
              {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <button
              type="button"
              onClick={() => setConfirmArchive(true)}
              className="p-2 rounded-md hover:bg-surface text-muted hover:text-danger min-h-[44px] min-w-[44px] shrink-0"
              aria-label="Archiver"
              title="Archiver"
            >
              <Archive size={18} aria-hidden />
            </button>
          </div>

          {contact.stage === 'closed_won' && (
            <Button onClick={handleCreateClient} className="w-full">
              <UserPlus size={16} className="mr-1" /> Créer client actif
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        onConfirm={() => { setConfirmArchive(false); handleArchive() }}
        title="Archiver ce prospect ?"
        description="Le prospect sera masqué du pipeline. Tu pourras le retrouver depuis les filtres archivés."
        confirmLabel="Archiver"
        confirmVariant="danger"
      />
    </div>
  )
}
