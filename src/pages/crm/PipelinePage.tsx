import { useMemo, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useMatch, useParams, useSearchParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { ContactCard } from './components/ContactCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { KanbanColumn } from './components/KanbanColumn'
import { MobileStageTabs } from './components/MobileStageTabs'
import { ContactDrawer } from './components/ContactDrawer'
import { ContactDetailDrawer } from './components/ContactDetailDrawer'
import { STAGES } from '@/features/crm/stages'
import {
  useContacts, useContact, useCreateContact, useUpdateContact, useChangeStage,
} from '@/features/crm/hooks'
import type { Contact, ContactStage } from '@/types/database'
import type { ContactFormOutput } from '@/features/crm/schema'

function isContactStage(s: string | null): s is ContactStage {
  return STAGES.some(stg => stg.id === s)
}

export function PipelinePage() {
  const navigate = useNavigate()
  const params = useParams<{ id?: string }>()
  const matchNew = useMatch('/crm/contacts/new')
  const matchDetail = useMatch('/crm/contacts/:id')
  const matchEdit = useMatch('/crm/contacts/:id/edit')
  const [searchParams] = useSearchParams()

  // The form drawer (create or edit) is mutually exclusive with the detail drawer.
  // URL → which drawer is open:
  //   /crm/contacts/new        → form drawer in create mode
  //   /crm/contacts/:id        → detail drawer (read view)
  //   /crm/contacts/:id/edit   → form drawer in edit mode
  // matchDetail also matches /crm/contacts/new (id='new'), so exclude that case.
  const mode: 'create' | 'edit' | null =
    matchNew ? 'create' : matchEdit ? 'edit' : null
  const formDrawerOpen = mode !== null
  const editingId = matchEdit ? params.id : undefined
  const detailId = matchDetail && !matchNew && !matchEdit ? params.id : undefined
  const detailDrawerOpen = !!detailId
  const presetStage = isContactStage(searchParams.get('stage'))
    ? (searchParams.get('stage') as ContactStage)
    : 'to_contact'

  const [search, setSearch] = useState('')
  const [mobileStage, setMobileStage] = useState<ContactStage>('to_contact')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [stageError, setStageError] = useState<string | null>(null)
  // Tracks the card currently being dragged so the DragOverlay can render
  // a ghost copy that follows the cursor across columns (the SortableCard
  // itself stays semi-transparent in its origin column).
  const [activeId, setActiveId] = useState<string | null>(null)
  const stageBusyRef = useRef(false)

  // Fetch ALL active contacts; we group/filter client-side.
  const contactsQuery = useContacts({ search })
  const editingContactQuery = useContact(editingId)

  const createMutation = useCreateContact()
  const updateMutation = useUpdateContact(editingId ?? '')
  const changeStageMutation = useChangeStage()

  // Group contacts by stage for the Kanban
  const grouped = useMemo(() => {
    const map = new Map<ContactStage, Contact[]>()
    STAGES.forEach(s => map.set(s.id, []))
    for (const c of contactsQuery.data ?? []) {
      map.get(c.stage)?.push(c)
    }
    return map
  }, [contactsQuery.data])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    if (stageBusyRef.current) return
    const { active, over } = event
    if (!over) return
    const contactId = String(active.id)
    const overId = String(over.id)
    // overId can be a stage id (column) or a card id (when dropped on another card).
    const newStage = isContactStage(overId)
      ? overId
      : (contactsQuery.data?.find(c => c.id === overId)?.stage ?? null)
    if (!newStage) return
    const contact = contactsQuery.data?.find(c => c.id === contactId)
    if (!contact || contact.stage === newStage) return

    stageBusyRef.current = true
    setStageError(null)
    changeStageMutation.mutate(
      { contactId, newStage },
      {
        onError: err => setStageError(err instanceof Error ? err.message : 'Erreur'),
        onSettled: () => { stageBusyRef.current = false },
      },
    )
  }

  const activeContact = activeId
    ? contactsQuery.data?.find(c => c.id === activeId) ?? null
    : null

  function closeFormDrawer() {
    setSubmitError(null)
    // Closing the edit drawer returns to the detail drawer of the same prospect,
    // so the user can keep browsing the timeline / followups they were on.
    // Closing the create drawer goes back to the Kanban.
    if (mode === 'edit' && editingId) {
      navigate(`/crm/contacts/${editingId}`)
    } else {
      navigate('/crm/pipeline')
    }
  }

  function closeDetailDrawer() {
    navigate('/crm/pipeline')
  }

  async function handleSubmit(values: ContactFormOutput) {
    setSubmitError(null)
    try {
      if (mode === 'create') {
        await createMutation.mutateAsync(values)
      } else if (mode === 'edit' && editingId) {
        await updateMutation.mutateAsync(values)
      }
      closeFormDrawer()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    }
  }

  const isLoading = contactsQuery.isLoading
  const isError = contactsQuery.isError

  return (
    <div className="flex flex-col gap-4 h-full">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Pipeline</h1>
          <p className="text-sm text-muted">
            {(contactsQuery.data?.length ?? 0)} prospects actifs
          </p>
        </div>
        <Button onClick={() => navigate('/crm/contacts/new')} className="w-full sm:w-auto">
          <Plus size={16} className="mr-1" /> Nouveau prospect
        </Button>
      </header>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
        <Input
          className="pl-9"
          placeholder="Rechercher un prospect…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Rechercher un prospect"
        />
      </div>

      {stageError && (
        <div className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2" role="alert">
          {stageError}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Spinner size="lg" className="text-accent" /></div>
      ) : isError ? (
        <div className="text-sm text-danger">Impossible de charger les prospects.</div>
      ) : (
        <>
          {/* Desktop: kanban */}
          <div className="hidden md:flex gap-3 overflow-x-auto no-scrollbar pb-4 flex-1">
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={() => setActiveId(null)}
            >
              {STAGES.map(s => (
                <KanbanColumn
                  key={s.id}
                  stage={s}
                  contacts={grouped.get(s.id) ?? []}
                />
              ))}
              {/* Portal the DragOverlay to document.body so the ghost escapes the
                  Kanban's overflow-x-auto clipping + any stacking context. dnd-kit
                  context propagates through React's tree, not the DOM tree, so the
                  DragOverlay still receives drag events through the parent DndContext. */}
              {createPortal(
                <DragOverlay dropAnimation={null} zIndex={9999}>
                  {/* Slight rotation + accent ring to differentiate the ghost from the
                      static SortableCard at origin (opacity 50% via ContactCard's
                      isDragging branch). ContactCard renders its own bg/padding/border,
                      so no double-styling. */}
                  {activeContact ? (
                    <div className="rotate-2 cursor-grabbing [&>a]:!border-accent/60 [&>a]:!shadow-2xl">
                      <ContactCard contact={activeContact} />
                    </div>
                  ) : null}
                </DragOverlay>,
                document.body,
              )}
            </DndContext>
          </div>

          {/* Mobile: tabs */}
          <MobileStageTabs
            contacts={contactsQuery.data ?? []}
            selectedStage={mobileStage}
            onSelectStage={setMobileStage}
          />
        </>
      )}

      <ContactDrawer
        open={formDrawerOpen}
        mode={(mode ?? 'create') as 'create' | 'edit'}
        contact={editingContactQuery.data ?? null}
        isLoadingContact={editingContactQuery.isLoading}
        submitting={createMutation.isPending || updateMutation.isPending}
        errorMessage={submitError}
        defaultStage={presetStage}
        onClose={closeFormDrawer}
        onSubmit={handleSubmit}
      />

      {detailId && (
        <ContactDetailDrawer
          contactId={detailId}
          open={detailDrawerOpen}
          onClose={closeDetailDrawer}
        />
      )}
    </div>
  )
}
