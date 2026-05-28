import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useContractsByClient } from '@/features/contracts/hooks'
import { getContractSignedUrl } from '@/features/contracts/api'
import { formatFileSize } from '@/features/contracts/format'
import type { Contract } from '@/types/database'

interface ClientContractsCardProps {
  clientId: string
}

const PREVIEW_LIMIT = 3

function formatSigned(iso: string): string {
  try {
    return format(new Date(iso), 'd MMMM yyyy', { locale: fr })
  } catch {
    return iso
  }
}

export function ClientContractsCard({ clientId }: ClientContractsCardProps) {
  const navigate = useNavigate()
  const { data: contracts, isLoading, isError } = useContractsByClient(clientId)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [openError, setOpenError] = useState<string | null>(null)

  async function handleOpen(c: Contract) {
    setOpeningId(c.id)
    setOpenError(null)
    try {
      const url = await getContractSignedUrl(c.storage_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : "Impossible d'ouvrir le fichier.")
    } finally {
      setOpeningId(null)
    }
  }

  const visible = (contracts ?? []).slice(0, PREVIEW_LIMIT)
  const total = contracts?.length ?? 0

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold tracking-wider text-muted uppercase">
          Contrats
        </h3>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(`/contracts/new?client=${clientId}`)}
        >
          <Plus className="h-3 w-3" />
          Ajouter
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-6">
          <Spinner size="sm" className="text-muted" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-muted">Impossible de charger les contrats.</p>
      )}

      {!isLoading && !isError && total === 0 && (
        <div className="text-sm text-muted">
          Aucun contrat.{' '}
          <Link
            to={`/contracts/new?client=${clientId}`}
            className="text-accent hover:underline"
          >
            Ajouter le premier contrat →
          </Link>
        </div>
      )}

      {openError && (
        <div className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2 mb-2">
          {openError}
        </div>
      )}

      {!isLoading && !isError && total > 0 && (
        <div className="space-y-1">
          {visible.map((c) => (
            <button
              key={c.id}
              onClick={() => handleOpen(c)}
              className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-bg transition"
            >
              {openingId === c.id ? (
                <Spinner size="sm" className="text-muted shrink-0" />
              ) : (
                <FileText className="h-4 w-4 text-muted shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm text-text truncate">{c.name}</div>
                <div className="text-xs text-muted">
                  {formatSigned(c.signed_at)} · {formatFileSize(c.file_size)}
                </div>
              </div>
            </button>
          ))}

          {total > PREVIEW_LIMIT && (
            <div className="pt-2 text-right">
              <Link
                to={`/contracts?client=${clientId}`}
                className="text-xs text-accent hover:underline"
              >
                Voir tous les contrats ({total}) →
              </Link>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
