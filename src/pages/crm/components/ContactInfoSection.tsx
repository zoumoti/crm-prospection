import { useNavigate } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SOURCE_LABELS } from '@/features/crm/stages'
import type { Contact } from '@/types/database'

interface ContactInfoSectionProps {
  contact: Contact
}

export function ContactInfoSection({ contact }: ContactInfoSectionProps) {
  const navigate = useNavigate()

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Poste',      value: contact.job_title || '—' },
    { label: 'Email',      value: contact.email
      ? <a href={`mailto:${contact.email}`} className="text-accent hover:underline break-words">{contact.email}</a>
      : '—' },
    { label: 'Téléphone',  value: contact.phone || '—' },
    { label: 'Source',     value: contact.source ? SOURCE_LABELS[contact.source] : '—' },
    { label: 'URL source', value: contact.source_url
      ? <a href={contact.source_url} target="_blank" rel="noreferrer" className="text-accent hover:underline break-all">{contact.source_url}</a>
      : '—' },
    { label: 'Niche',      value: contact.niche || '—' },
    { label: 'Lien Loom',  value: contact.loom_url
      ? <a href={contact.loom_url} target="_blank" rel="noreferrer" className="text-accent hover:underline break-all">{contact.loom_url}</a>
      : '—' },
  ]

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 gap-2">
        <h2 className="text-base sm:text-lg font-semibold">Infos prospect</h2>
        <Button variant="ghost" onClick={() => navigate(`/crm/contacts/${contact.id}/edit`)}>
          <Pencil size={14} className="mr-1" /> Modifier
        </Button>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        {rows.map(row => (
          <div key={row.label}>
            <dt className="text-xs uppercase tracking-wider text-muted">{row.label}</dt>
            <dd className="text-text mt-0.5">{row.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
