import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, MoreHorizontal, Pencil, Archive } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Spinner } from '@/components/ui/Spinner'
import { useArchiveContract } from '@/features/contracts/hooks'
import { getContractSignedUrl } from '@/features/contracts/api'
import { formatFileSize, getFileExtension } from '@/features/contracts/format'
import type { Contract } from '@/types/database'

interface ContractsTableProps {
  contracts: Contract[]
  clientLabel: (clientId: string) => string
}

function formatSignedAt(iso: string): string {
  try {
    return format(new Date(iso), 'd MMM yyyy', { locale: fr })
  } catch {
    return iso
  }
}

interface RowMenuProps {
  contract: Contract
  onEdit: () => void
  onArchive: () => void
}

function RowMenu({ contract, onEdit, onArchive }: RowMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])
  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Actions contrat ${contract.name}`}
        className="h-8 w-8 rounded-lg flex items-center justify-center text-muted hover:bg-bg transition cursor-pointer"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-48 rounded-xl bg-surface border border-border shadow-card p-2 z-30">
          <button
            onClick={() => {
              setOpen(false)
              onEdit()
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text hover:bg-bg transition"
          >
            <Pencil className="h-4 w-4" /> Modifier
          </button>
          <button
            onClick={() => {
              setOpen(false)
              onArchive()
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-danger hover:bg-danger/10 transition"
          >
            <Archive className="h-4 w-4" /> Archiver
          </button>
        </div>
      )}
    </div>
  )
}

export function ContractsTable({ contracts, clientLabel }: ContractsTableProps) {
  const navigate = useNavigate()
  const archive = useArchiveContract()
  const [confirmArchive, setConfirmArchive] = useState<Contract | null>(null)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [openError, setOpenError] = useState<string | null>(null)

  async function handleOpen(contract: Contract) {
    setOpeningId(contract.id)
    setOpenError(null)
    try {
      const url = await getContractSignedUrl(contract.storage_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : "Impossible d'ouvrir le fichier.")
    } finally {
      setOpeningId(null)
    }
  }

  async function executeArchive() {
    if (!confirmArchive) return
    await archive.mutateAsync(confirmArchive.id)
    setConfirmArchive(null)
  }

  return (
    <>
      {openError && (
        <div className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2 mb-3">
          {openError}
        </div>
      )}

      {/* Desktop table */}
      {/* overflow-visible so the row actions dropdown isn't clipped by the rounded wrapper. */}
      <div className="hidden md:block rounded-2xl border border-border/40 bg-surface shadow-card">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs font-semibold tracking-wider text-muted uppercase border-b border-border">
              <th className="px-5 py-3">Nom</th>
              <th className="px-5 py-3">Client</th>
              <th className="px-5 py-3">Date signature</th>
              <th className="px-5 py-3">Taille</th>
              <th className="px-5 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((c) => (
              <tr
                key={c.id}
                onClick={() => handleOpen(c)}
                className="border-b border-border/60 last:border-b-0 hover:bg-bg cursor-pointer transition"
              >
                <td className="px-5 py-3 text-sm text-text">
                  <div className="flex items-center gap-2 min-w-0">
                    {openingId === c.id ? (
                      <Spinner size="sm" className="text-muted shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted shrink-0" />
                    )}
                    <span className="truncate">{c.name}</span>
                    <span className="text-xs text-muted shrink-0 uppercase">
                      {getFileExtension(c.file_name)}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 text-sm text-muted">{clientLabel(c.client_id)}</td>
                <td className="px-5 py-3 text-sm text-muted">{formatSignedAt(c.signed_at)}</td>
                <td className="px-5 py-3 text-sm text-muted">{formatFileSize(c.file_size)}</td>
                <td className="px-5 py-3">
                  <RowMenu
                    contract={c}
                    onEdit={() => navigate(`/contracts/${c.id}/edit`)}
                    onArchive={() => setConfirmArchive(c)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {contracts.map((c) => (
          <div
            key={c.id}
            className="bg-surface rounded-2xl border border-border/40 shadow-card p-4 flex items-start justify-between gap-2"
          >
            <button
              onClick={() => handleOpen(c)}
              className="flex-1 text-left min-w-0"
            >
              <div className="flex items-center gap-2 mb-1">
                {openingId === c.id ? (
                  <Spinner size="sm" className="text-muted shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 text-muted shrink-0" />
                )}
                <span className="text-sm font-medium text-text truncate">{c.name}</span>
              </div>
              <div className="text-xs text-muted truncate">{clientLabel(c.client_id)}</div>
              <div className="text-xs text-muted mt-2 flex items-center justify-between">
                <span>{formatSignedAt(c.signed_at)}</span>
                <span>{formatFileSize(c.file_size)}</span>
              </div>
            </button>
            <RowMenu
              contract={c}
              onEdit={() => navigate(`/contracts/${c.id}/edit`)}
              onArchive={() => setConfirmArchive(c)}
            />
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!confirmArchive}
        onClose={() => setConfirmArchive(null)}
        onConfirm={executeArchive}
        loading={archive.isPending}
        title={confirmArchive ? `Archiver « ${confirmArchive.name} » ?` : ''}
        description="Le contrat n'apparaîtra plus dans la liste mais reste en base et le fichier est conservé dans Storage."
        confirmLabel="Archiver"
        confirmVariant="danger"
      />
    </>
  )
}
