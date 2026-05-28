import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Combobox, type ComboboxOption } from '@/components/ui/Combobox'
import { cn } from '@/lib/utils'
import type { Client } from '@/types/database'

export type TaskTab = 'all' | 'today' | 'week'

interface TaskFiltersBarProps {
  tab: TaskTab
  onTabChange: (tab: TaskTab) => void
  clientId: string | null
  onClientChange: (clientId: string | null) => void
  clients: Pick<Client, 'id' | 'first_name' | 'last_name' | 'company'>[]
  onCreate: () => void
}

const TABS: { value: TaskTab; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'today', label: "Aujourd'hui" },
  { value: 'week', label: 'Cette semaine' },
]

export function TaskFiltersBar({
  tab,
  onTabChange,
  clientId,
  onClientChange,
  clients,
  onCreate,
}: TaskFiltersBarProps) {
  const clientOptions: ComboboxOption[] = clients.map((c) => ({
    value: c.id,
    label: `${c.first_name} ${c.last_name}`,
    meta: c.company ?? undefined,
  }))

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 overflow-x-auto sm:overflow-visible">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => onTabChange(t.value)}
            className={cn(
              'h-9 px-3 rounded-xl text-sm font-medium transition shrink-0',
              tab === t.value
                ? 'bg-accent-soft text-accent'
                : 'text-muted hover:bg-bg'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="w-48 sm:w-56">
          <Combobox
            options={clientOptions}
            value={clientId}
            onChange={onClientChange}
            placeholder="Tous les clients"
            emptyMessage="Aucun client"
            allowClear
          />
        </div>
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Ajouter</span>
        </Button>
      </div>
    </div>
  )
}
