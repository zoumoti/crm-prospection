import { Link, useNavigate } from 'react-router-dom'
import { Film } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SOURCE_LABELS, SOURCE_STYLES } from '@/features/crm/stages'
import type { Contact } from '@/types/database'

interface ContactCardProps {
  contact: Contact
  /** When true, the wrapper is a non-link div (sortable will handle interactivity). */
  asDrag?: boolean
  /** Drag attributes from useSortable; injected by the parent column. */
  dragProps?: {
    attributes: Record<string, unknown>
    listeners: Record<string, unknown> | undefined
    setNodeRef: (el: HTMLElement | null) => void
    style: React.CSSProperties
    isDragging: boolean
  }
}

export function ContactCard({ contact, asDrag = false, dragProps }: ContactCardProps) {
  const navigate = useNavigate()
  const name = `${contact.first_name} ${contact.last_name}`.trim()
  const subline = [contact.company, contact.niche].filter(Boolean).join(' · ')

  const inner = (
    <>
      <div className="font-semibold text-sm text-text truncate">{name}</div>
      {subline && (
        <div className="text-xs text-muted truncate">{subline}</div>
      )}
      <div className="mt-2 flex items-center gap-2 text-[11px]">
        {contact.source && (
          <span className={cn(
            'px-2 py-0.5 rounded-full font-medium',
            SOURCE_STYLES[contact.source].bg,
            SOURCE_STYLES[contact.source].text,
          )}>
            {SOURCE_LABELS[contact.source]}
          </span>
        )}
        {contact.loom_url && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-soft text-purple">
            <Film size={11} aria-hidden />
            Loom
          </span>
        )}
      </div>
    </>
  )

  if (asDrag && dragProps) {
    return (
      <div
        ref={dragProps.setNodeRef}
        style={dragProps.style}
        onClick={() => {
          // The PointerSensor uses activationConstraint.distance = 8, so a
          // stationary click never starts a drag; the click event fires
          // normally and we route to the detail page. A real drag (movement
          // ≥ 8px) suppresses the synthetic click via dnd-kit.
          if (!dragProps.isDragging) navigate(`/crm/contacts/${contact.id}`)
        }}
        className={cn(
          'bg-surface rounded-xl px-3 py-2.5 shadow-card cursor-grab active:cursor-grabbing',
          'border border-border/40 hover:border-accent/40 transition-colors',
          dragProps.isDragging && 'opacity-50',
        )}
        {...dragProps.attributes}
        {...dragProps.listeners}
      >
        {inner}
      </div>
    )
  }

  return (
    <Link
      to={`/crm/contacts/${contact.id}`}
      className="block bg-surface rounded-xl px-3 py-2.5 shadow-card border border-border/40 hover:border-accent/40 transition-colors min-h-[64px]"
    >
      {inner}
    </Link>
  )
}
