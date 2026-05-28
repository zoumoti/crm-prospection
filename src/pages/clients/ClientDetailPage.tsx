import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, MoreHorizontal, Archive, ExternalLink, AppWindow } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ClientContractsCard } from './components/ClientContractsCard'
import { ClientInfoCard } from './components/ClientInfoCard'
import { ClientTasksCard } from './components/ClientTasksCard'
import { LinkedSectionStub } from './components/LinkedSectionStub'
import { useClient, useArchiveClient } from '@/features/clients/hooks'

function formatStartDate(iso: string | null): string | null {
  if (!iso) return null
  try {
    return format(new Date(iso), 'd MMMM yyyy', { locale: fr })
  } catch {
    return null
  }
}

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: client, isLoading, isError } = useClient(id)
  const archiveMutation = useArchiveClient()

  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [archiveError, setArchiveError] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" className="text-accent" />
      </div>
    )
  }

  if (isError || !client) {
    return <Navigate to="/clients" replace />
  }

  const startDate = formatStartDate(client.start_date)

  async function doArchive() {
    if (!client) return
    setArchiveError(null)
    try {
      await archiveMutation.mutateAsync(client.id)
      navigate('/clients')
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <Link
          to="/clients"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-text transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate(`/clients/${client.id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
            Modifier
          </Button>
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Plus d'actions"
              className="h-11 w-11 rounded-xl border border-border bg-surface flex items-center justify-center text-text hover:bg-bg transition"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-surface border border-border shadow-card p-2 z-30">
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    setConfirmArchive(true)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-danger hover:bg-danger/10 transition"
                >
                  <Archive className="h-4 w-4" />
                  Archiver
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-text">
          {client.first_name} {client.last_name}
        </h1>
        <p className="text-sm text-muted mt-1">
          {[
            client.company,
            <span key="code" className="font-mono">
              {client.code_client}
            </span>,
            startDate && `Client depuis le ${startDate}`,
          ]
            .filter(Boolean)
            .map((piece, i, arr) => (
              <span key={i}>
                {piece}
                {i < arr.length - 1 && ' · '}
              </span>
            ))}
        </p>
      </div>

      <ClientInfoCard client={client} />

      {client.portal_links && client.portal_links.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <AppWindow className="h-4 w-4 text-muted" />
            <h2 className="text-base font-semibold text-text">Applications</h2>
          </div>
          <div className="space-y-2">
            {client.portal_links.map((link, i) => (
              <a
                key={`${link.url}-${i}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg/40 px-4 py-3 hover:border-accent/40 hover:bg-accent-soft transition group"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text truncate">{link.label}</div>
                  <div className="text-xs text-muted font-mono truncate">
                    {link.url.replace(/^https?:\/\//, '')}
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted group-hover:text-accent transition shrink-0" />
              </a>
            ))}
          </div>
        </Card>
      )}

      <LinkedSectionStub title="Factures liées" />
      <ClientContractsCard clientId={client.id} />
      <ClientTasksCard
        clientId={client.id}
        clientFirstName={client.first_name}
        clientLastName={client.last_name}
      />

      <ConfirmDialog
        open={confirmArchive}
        onClose={() => {
          setConfirmArchive(false)
          setArchiveError(null)
        }}
        onConfirm={doArchive}
        title={`Archiver ${client.first_name} ${client.last_name} ?`}
        description={
          <>
            <p>
              Le client n'apparaîtra plus dans la liste mais ses données restent
              intactes. Tu pourras le restaurer plus tard.
            </p>
            {archiveError && (
              <p className="text-danger mt-2">{archiveError}</p>
            )}
          </>
        }
        confirmLabel="Archiver"
        confirmVariant="danger"
        loading={archiveMutation.isPending}
      />
    </div>
  )
}
