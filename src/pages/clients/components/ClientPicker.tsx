import { Combobox } from '@/components/ui/Combobox'
import { useClients } from '@/features/clients/hooks'

interface ClientPickerProps {
  value: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
}

export function ClientPicker({ value, onChange, disabled }: ClientPickerProps) {
  const { data: clients = [] } = useClients()
  const options = clients.map((c) => ({
    value: c.id,
    label: `${c.first_name} ${c.last_name}`,
    meta: c.company ? `${c.company} · ${c.code_client}` : c.code_client,
  }))
  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder="Sélectionner un client…"
      disabled={disabled}
    />
  )
}
