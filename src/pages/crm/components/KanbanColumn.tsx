import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { ContactCard } from './ContactCard'
import type { Contact } from '@/types/database'
import type { StageDef } from '@/features/crm/stages'

interface KanbanColumnProps {
  stage: StageDef
  contacts: Contact[]
}

export function KanbanColumn({ stage, contacts }: KanbanColumnProps) {
  const navigate = useNavigate()
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

  return (
    <div className="w-[280px] shrink-0 flex flex-col max-h-full">
      <div className="sticky top-0 z-10 bg-bg pt-1 pb-2">
        <div className="flex items-center justify-between gap-2">
          <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', stage.bg, stage.text)}>
            {stage.label}
          </span>
          <span className="text-xs text-muted">{contacts.length}</span>
          <button
            type="button"
            onClick={() => navigate(`/crm/contacts/new?stage=${stage.id}`)}
            className="p-1 rounded-md hover:bg-surface text-muted hover:text-text"
            aria-label={`Nouveau prospect dans ${stage.label}`}
          >
            <Plus size={16} aria-hidden />
          </button>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-[120px] rounded-xl p-2 space-y-2 overflow-y-auto',
          'bg-surface/30 border border-dashed transition-colors',
          isOver ? 'border-accent/60 bg-accent-soft' : 'border-transparent',
        )}
      >
        <SortableContext
          items={contacts.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {contacts.map(c => <SortableCard key={c.id} contact={c} />)}
        </SortableContext>
      </div>
    </div>
  )
}

function SortableCard({ contact }: { contact: Contact }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: contact.id })

  return (
    <ContactCard
      contact={contact}
      asDrag
      dragProps={{
        attributes: attributes as unknown as Record<string, unknown>,
        listeners: listeners as unknown as Record<string, unknown> | undefined,
        setNodeRef,
        style: { transform: CSS.Transform.toString(transform), transition },
        isDragging,
      }}
    />
  )
}
