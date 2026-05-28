import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useMatch } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { Input } from '@/components/ui/Input'
import { ProductsTable } from './components/ProductsTable'
import { ProductFormDrawer } from './components/ProductFormDrawer'
import {
  useProducts,
  useProduct,
  useCreateProduct,
  useUpdateProduct,
} from '@/features/products/hooks'
import type { ProductFormOutput } from '@/features/products/schema'

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function ProductsPage() {
  const navigate = useNavigate()
  const params = useParams<{ id?: string }>()
  const matchNew = useMatch('/products/new')
  const matchEdit = useMatch('/products/:id/edit')

  const mode: 'create' | 'edit' | null = matchNew ? 'create' : matchEdit ? 'edit' : null
  const drawerOpen = mode !== null
  const editingId = matchEdit ? params.id : undefined

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200)
    return () => clearTimeout(t)
  }, [search])

  const { data: products, isLoading, isError, refetch } = useProducts()
  const editingQuery = useProduct(editingId)
  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct(editingId ?? '')

  const filtered = useMemo(() => {
    if (!products) return []
    if (!debouncedSearch.trim()) return products
    const needle = normalize(debouncedSearch.trim())
    return products.filter((p) =>
      normalize(`${p.reference} ${p.description}`).includes(needle)
    )
  }, [products, debouncedSearch])

  function closeDrawer() {
    setSubmitError(null)
    navigate('/products')
  }

  async function handleSubmit(values: ProductFormOutput) {
    setSubmitError(null)
    try {
      if (mode === 'create') {
        await createMutation.mutateAsync(values)
      } else if (mode === 'edit' && editingId) {
        await updateMutation.mutateAsync(values)
      }
      closeDrawer()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    }
  }

  const submitting = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par référence ou description…"
              className="pl-9"
            />
          </div>
          <Button onClick={() => navigate('/products/new')}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Ajouter un produit</span>
            <span className="sm:hidden">Ajouter</span>
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" className="text-accent" />
          </div>
        )}

        {isError && (
          <Card className="text-center">
            <p className="text-sm text-danger mb-3">Impossible de charger les produits.</p>
            <Button variant="secondary" onClick={() => refetch()}>Réessayer</Button>
          </Card>
        )}

        {!isLoading && !isError && products && products.length === 0 && (
          <Card className="text-center py-12">
            <p className="text-sm text-muted mb-4">Aucun produit pour l'instant.</p>
            <Button onClick={() => navigate('/products/new')}>
              <Plus className="h-4 w-4" />
              Ajouter votre premier produit
            </Button>
          </Card>
        )}

        {!isLoading && !isError && products && products.length > 0 && filtered.length === 0 && (
          <Card className="text-center">
            <p className="text-sm text-muted">
              Aucun produit ne correspond à «&nbsp;{debouncedSearch}&nbsp;».
            </p>
          </Card>
        )}

        {!isLoading && !isError && filtered.length > 0 && <ProductsTable products={filtered} />}
      </div>

      <ProductFormDrawer
        open={drawerOpen}
        mode={mode === 'create' ? 'create' : 'edit'}
        product={editingQuery.data}
        isLoadingProduct={mode === 'edit' && editingQuery.isLoading}
        submitting={submitting}
        errorMessage={submitError}
        onClose={closeDrawer}
        onSubmit={handleSubmit}
      />
    </>
  )
}
