import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import {
  productFormSchema,
  emptyProductForm,
  type ProductFormValues,
  type ProductFormOutput,
} from '@/features/products/schema'
import type { Product } from '@/types/database'

interface ProductFormDrawerProps {
  open: boolean
  mode: 'create' | 'edit'
  product?: Product | null
  isLoadingProduct?: boolean
  submitting: boolean
  errorMessage: string | null
  onClose: () => void
  onSubmit: (values: ProductFormOutput) => Promise<void>
}

function toFormValues(p: Product): ProductFormValues {
  return {
    reference: p.reference,
    description: p.description,
    default_price_ht: p.default_price_ht === null ? '' : String(p.default_price_ht).replace('.', ','),
  }
}

export function ProductFormDrawer({
  open,
  mode,
  product,
  isLoadingProduct,
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}: ProductFormDrawerProps) {
  const form = useForm<ProductFormValues, undefined, ProductFormOutput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: emptyProductForm,
    mode: 'onBlur',
  })
  const { register, handleSubmit, reset, formState } = form

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && product) {
      reset(toFormValues(product))
    } else if (mode === 'create') {
      reset(emptyProductForm)
    }
  }, [open, mode, product, reset])

  const title = mode === 'create' ? 'Nouveau produit' : 'Modifier le produit'

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
        Annuler
      </Button>
      <Button
        type="submit"
        form="product-form"
        disabled={submitting || (mode === 'edit' && isLoadingProduct)}
      >
        {submitting ? <Spinner size="sm" /> : 'Enregistrer'}
      </Button>
    </div>
  )

  return (
    <Drawer open={open} onClose={onClose} title={title} footer={footer}>
      {mode === 'edit' && isLoadingProduct ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" className="text-accent" />
        </div>
      ) : (
        <form
          id="product-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          {errorMessage && (
            <div className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">
              {errorMessage}
            </div>
          )}
          <div>
            <Label className="mb-1.5 block">Référence *</Label>
            <Input {...register('reference')} placeholder="EBOOK-HUGO-2024-001" autoComplete="off" />
            {formState.errors.reference && (
              <div className="text-xs text-danger mt-1">{formState.errors.reference.message}</div>
            )}
          </div>
          <div>
            <Label className="mb-1.5 block">Description *</Label>
            <textarea
              {...register('description')}
              aria-label="Description"
              rows={2}
              className={cn(
                'w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted',
                'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20'
              )}
            />
            {formState.errors.description && (
              <div className="text-xs text-danger mt-1">{formState.errors.description.message}</div>
            )}
          </div>
          <div>
            <Label className="mb-1.5 block">Prix HT par défaut</Label>
            <Input
              {...register('default_price_ht')}
              inputMode="decimal"
              placeholder="Optionnel — laisser vide pour tarif variable"
            />
            {formState.errors.default_price_ht && (
              <div className="text-xs text-danger mt-1">{formState.errors.default_price_ht.message}</div>
            )}
          </div>
        </form>
      )}
    </Drawer>
  )
}
