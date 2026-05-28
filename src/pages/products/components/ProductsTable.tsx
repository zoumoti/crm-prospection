import { useNavigate } from 'react-router-dom'
import { MoreHorizontal, Archive } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useArchiveProduct } from '@/features/products/hooks'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { Product } from '@/types/database'

function formatPrice(p: number | null): string {
  if (p === null) return '—'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(p)
}

function RowMenu({ product, onArchive }: { product: Product; onArchive: () => void }) {
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
        aria-label={`Actions pour ${product.reference}`}
        className="h-8 w-8 rounded-lg flex items-center justify-center text-muted hover:bg-bg transition"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-48 rounded-xl bg-surface border border-border shadow-card p-2 z-30">
          <button
            onClick={() => {
              setOpen(false)
              onArchive()
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-danger hover:bg-danger/10 transition"
          >
            <Archive className="h-4 w-4" />
            Archiver
          </button>
        </div>
      )}
    </div>
  )
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(
      new Date(iso)
    )
  } catch {
    return '—'
  }
}

export function ProductsTable({ products }: { products: Product[] }) {
  const navigate = useNavigate()
  const archive = useArchiveProduct()
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const toConfirm = products.find((p) => p.id === confirmId)

  async function doArchive() {
    if (!confirmId) return
    await archive.mutateAsync(confirmId)
    setConfirmId(null)
  }

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-border/40 bg-surface shadow-card">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs font-semibold tracking-wider text-muted uppercase border-b border-border">
              <th className="px-5 py-3">Référence</th>
              <th className="px-5 py-3">Description</th>
              <th className="px-5 py-3">Prix HT défaut</th>
              <th className="px-5 py-3">Créé le</th>
              <th className="px-5 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr
                key={p.id}
                onClick={() => navigate(`/products/${p.id}/edit`)}
                className="border-b border-border/60 last:border-b-0 hover:bg-bg cursor-pointer transition"
              >
                <td className="px-5 py-3 text-sm font-mono text-text">{p.reference}</td>
                <td className="px-5 py-3 text-sm text-text">{p.description}</td>
                <td className="px-5 py-3 text-sm text-muted">{formatPrice(p.default_price_ht)}</td>
                <td className="px-5 py-3 text-sm text-muted">{formatDate(p.created_at)}</td>
                <td className="px-5 py-3"><RowMenu product={p} onArchive={() => setConfirmId(p.id)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-3">
        {products.map((p) => (
          <div
            key={p.id}
            className="bg-surface rounded-2xl border border-border/40 shadow-card p-4 flex items-start justify-between gap-2"
          >
            <button
              onClick={() => navigate(`/products/${p.id}/edit`)}
              className="flex-1 text-left"
            >
              <div className="text-sm font-mono text-text">{p.reference}</div>
              <div className="text-xs text-muted mt-1">{p.description}</div>
              {p.default_price_ht !== null && (
                <div className="text-xs text-muted mt-2">{formatPrice(p.default_price_ht)}</div>
              )}
            </button>
            <RowMenu product={p} onArchive={() => setConfirmId(p.id)} />
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={doArchive}
        title={toConfirm ? `Archiver « ${toConfirm.reference} » ?` : 'Archiver ?'}
        description="Le produit n'apparaîtra plus dans la liste mais reste en base."
        confirmLabel="Archiver"
        confirmVariant="danger"
        loading={archive.isPending}
      />
    </>
  )
}
