import { Mail, Phone, MapPin, ExternalLink } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { displayHandle } from '@/features/clients/normalize'
import type { Client } from '@/types/database'

function SocialLink({ url, label }: { url: string; label: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
    >
      {label}
      <ExternalLink className="h-3 w-3" />
    </a>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mt-6 first:mt-0">
      <h3 className="text-xs font-semibold tracking-wider text-muted uppercase mb-2">
        {title}
      </h3>
      {children}
    </div>
  )
}

export function ClientInfoCard({ client }: { client: Client }) {
  const hasCoordinates = client.email || client.phone || client.address
  const hasSocial = client.instagram || client.linkedin || client.tiktok
  const hasBusiness = client.siret

  return (
    <Card>
      {hasCoordinates && (
        <Section title="Coordonnées">
          <div className="space-y-2 text-sm text-text">
            {client.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted shrink-0" />
                <a href={`mailto:${client.email}`} className="hover:underline">
                  {client.email}
                </a>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted shrink-0" />
                <a href={`tel:${client.phone}`} className="hover:underline">
                  {client.phone}
                </a>
              </div>
            )}
            {client.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted shrink-0 mt-0.5" />
                <span>{client.address}</span>
              </div>
            )}
          </div>
        </Section>
      )}

      {hasSocial && (
        <Section title="Réseaux">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {client.instagram && (
              <SocialLink
                url={client.instagram}
                label={`Instagram · ${displayHandle(client.instagram) ?? client.instagram}`}
              />
            )}
            {client.linkedin && (
              <SocialLink
                url={client.linkedin}
                label={`LinkedIn · ${displayHandle(client.linkedin) ?? client.linkedin}`}
              />
            )}
            {client.tiktok && (
              <SocialLink
                url={client.tiktok}
                label={`TikTok · ${displayHandle(client.tiktok) ?? client.tiktok}`}
              />
            )}
          </div>
        </Section>
      )}

      {hasBusiness && (
        <Section title="Détails business">
          <div className="text-sm text-text">
            <span className="text-muted">SIRET : </span>
            <span className="font-mono">{client.siret}</span>
          </div>
        </Section>
      )}

      {client.notes && (
        <Section title="Notes">
          <p className="text-sm text-text whitespace-pre-wrap">{client.notes}</p>
        </Section>
      )}

      {!hasCoordinates && !hasSocial && !hasBusiness && !client.notes && (
        <p className="text-sm text-muted">Aucune information supplémentaire.</p>
      )}
    </Card>
  )
}
