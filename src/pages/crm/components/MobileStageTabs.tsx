import { cn } from '@/lib/utils'
import { STAGES } from '@/features/crm/stages'
import { ContactCard } from './ContactCard'
import type { Contact, ContactStage } from '@/types/database'

interface MobileStageTabsProps {
  contacts: Contact[]
  selectedStage: ContactStage
  onSelectStage: (stage: ContactStage) => void
}

export function MobileStageTabs({ contacts, selectedStage, onSelectStage }: MobileStageTabsProps) {
  const countsByStage = new Map<ContactStage, number>()
  for (const c of contacts) {
    countsByStage.set(c.stage, (countsByStage.get(c.stage) ?? 0) + 1)
  }
  const visible = contacts.filter(c => c.stage === selectedStage)

  return (
    <div className="md:hidden flex flex-col gap-3">
      <div className="-mx-4 px-4 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {STAGES.map(s => {
            const active = s.id === selectedStage
            const count = countsByStage.get(s.id) ?? 0
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelectStage(s.id)}
                className={cn(
                  'flex-shrink-0 px-3 py-2 rounded-full text-xs font-medium border min-h-[44px]',
                  active
                    ? cn(s.bg, s.text, 'border-transparent')
                    : 'bg-surface text-muted border-border',
                )}
                aria-pressed={active}
              >
                {s.label} <span className="ml-1 opacity-60">{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        {visible.length === 0 ? (
          <div className="text-center text-sm text-muted py-12">
            Aucun prospect dans ce stage.
          </div>
        ) : (
          visible.map(c => <ContactCard key={c.id} contact={c} />)
        )}
      </div>
    </div>
  )
}
