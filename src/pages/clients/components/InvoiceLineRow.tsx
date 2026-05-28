import { useFormContext, useWatch } from 'react-hook-form'
import { Trash2 } from 'lucide-react'
import { Combobox } from '@/components/ui/Combobox'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { useProducts } from '@/features/products/hooks'
import { calculateLineTotal, formatCurrency } from '@/features/invoices/totals'
import type { InvoiceFormValues } from '@/features/invoices/schema'

interface InvoiceLineRowProps {
  index: number
  onRemove: () => void
  canRemove: boolean
}

function parsePrice(v: string): number {
  const n = Number(v.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function InvoiceLineRow({ index, onRemove, canRemove }: InvoiceLineRowProps) {
  const { register, control, setValue, formState } = useFormContext<InvoiceFormValues>()
  const { data: products = [] } = useProducts()

  const reference = useWatch({ control, name: `lines.${index}.reference` })
  const unitPriceHt = useWatch({ control, name: `lines.${index}.unit_price_ht` })
  const quantity = useWatch({ control, name: `lines.${index}.quantity` })

  const total = calculateLineTotal(parsePrice(unitPriceHt ?? ''), parsePrice(quantity ?? ''))

  // Combobox value derives from the current reference so the dropdown reflects the selection
  const matchedProduct = products.find((p) => p.reference === reference)
  const productValue = matchedProduct?.id ?? null

  function applyProduct(productId: string | null) {
    if (!productId) {
      setValue(`lines.${index}.reference`, '', { shouldDirty: true })
      setValue(`lines.${index}.description`, '', { shouldDirty: true })
      return
    }
    const p = products.find((x) => x.id === productId)
    if (!p) return
    setValue(`lines.${index}.reference`, p.reference, { shouldDirty: true })
    setValue(`lines.${index}.description`, p.description, { shouldDirty: true })
    if (p.default_price_ht !== null) {
      setValue(`lines.${index}.unit_price_ht`, String(p.default_price_ht).replace('.', ','), {
        shouldDirty: true,
      })
    }
  }

  const productOptions = products.map((p) => ({
    value: p.id,
    label: p.reference,
    meta: p.description,
  }))

  const errors = formState.errors.lines?.[index]

  return (
    <div className="rounded-xl border border-border/40 bg-bg p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-wider text-muted uppercase">
          Ligne {index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`Supprimer ligne ${index + 1}`}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10 disabled:opacity-30 disabled:pointer-events-none transition"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div>
        <Label className="mb-1.5 block">Produit du catalogue</Label>
        <Combobox
          options={productOptions}
          value={productValue}
          onChange={applyProduct}
          placeholder="Optionnel — sélectionner pour pré-remplir…"
          allowClear
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-1">
          <Label className="mb-1.5 block">Référence</Label>
          <Input {...register(`lines.${index}.reference`)} placeholder="Ex: EBOOK-001" />
        </div>
        <div className="sm:col-span-2">
          <Label className="mb-1.5 block">Description *</Label>
          <Input {...register(`lines.${index}.description`)} placeholder="Détail de la prestation" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 items-end">
        <div>
          <Label className="mb-1.5 block">Prix HT *</Label>
          <Input
            {...register(`lines.${index}.unit_price_ht`)}
            inputMode="decimal"
            placeholder="0,00"
          />
        </div>
        <div>
          <Label className="mb-1.5 block">Quantité *</Label>
          <Input
            {...register(`lines.${index}.quantity`)}
            inputMode="decimal"
            placeholder="1"
          />
        </div>
        <div className="text-right">
          <div className="text-xs text-muted mb-1.5">Total HT</div>
          <div className="text-base font-semibold text-text whitespace-nowrap">
            {formatCurrency(total)}
          </div>
        </div>
      </div>

      {(errors?.description || errors?.unit_price_ht || errors?.quantity) && (
        <div className="text-xs text-danger">
          {errors?.description?.message || errors?.unit_price_ht?.message || errors?.quantity?.message}
        </div>
      )}
    </div>
  )
}
