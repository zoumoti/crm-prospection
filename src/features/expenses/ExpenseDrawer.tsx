import { useEffect, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Spinner } from '@/components/ui/Spinner'
import { FileUploadZone } from '@/components/ui/FileUploadZone'
import { cn } from '@/lib/utils'
import {
  expenseFormSchema,
  emptyExpenseForm,
  RECEIPT_ACCEPTED_MIMES,
  RECEIPT_MAX_SIZE_BYTES,
  RECEIPT_ACCEPT_ATTR,
  type ExpenseFormValues,
  type ExpenseFormOutput,
} from './schema'
import { useExpense, useExpenseCategories, useCreateExpense, useUpdateExpense } from './hooks'

interface ExpenseDrawerProps {
  mode: 'create' | 'edit'
  id?: string
  onClose: () => void
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function ExpenseDrawer({ mode, id, onClose }: ExpenseDrawerProps) {
  const isEdit = mode === 'edit'
  const { data: existing, isLoading } = useExpense(isEdit ? id : undefined)
  const { data: categories } = useExpenseCategories()
  const create = useCreateExpense()
  const update = useUpdateExpense(id ?? '')
  const submittingRef = useRef(false)

  const form = useForm<ExpenseFormValues, undefined, ExpenseFormOutput>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: emptyExpenseForm(todayIso()),
    mode: 'onBlur',
  })

  useEffect(() => {
    if (isEdit && existing) {
      form.reset({
        amount: String(existing.amount).replace('.', ','),
        category: existing.category,
        description: existing.description,
        expense_date: existing.expense_date,
        file: undefined,
        removeReceipt: false,
      })
    }
  }, [isEdit, existing, form])

  const isPending = create.isPending || update.isPending
  const currentFile =
    isEdit && existing && existing.file_name && existing.file_size != null
      ? { name: existing.file_name, size: existing.file_size }
      : null

  async function onSubmit(values: ExpenseFormOutput) {
    if (submittingRef.current) return
    submittingRef.current = true
    try {
      if (isEdit && id && existing) {
        await update.mutateAsync({
          amount: values.amount,
          category: values.category,
          description: values.description,
          expense_date: values.expense_date,
          newFile: values.file,
          removeReceipt: values.removeReceipt,
          currentStoragePath: existing.storage_path,
        })
      } else {
        await create.mutateAsync({
          amount: values.amount,
          category: values.category,
          description: values.description,
          expense_date: values.expense_date,
          file: values.file,
        })
      }
      onClose()
    } finally {
      submittingRef.current = false
    }
  }

  const errors = form.formState.errors

  return (
    <Drawer
      open
      onClose={onClose}
      title={isEdit ? 'Modifier la dépense' : 'Nouvelle dépense'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>Annuler</Button>
          <Button
            type="submit"
            form="expense-form"
            disabled={isPending || (isEdit && isLoading)}
          >
            {isPending ? <Spinner size="sm" /> : 'Enregistrer'}
          </Button>
        </div>
      }
    >
      {isEdit && isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" className="text-accent" />
        </div>
      ) : (
        <form
          id="expense-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <div>
            <Label className="mb-1.5 block">Montant (€) *</Label>
            <Input
              {...form.register('amount')}
              inputMode="decimal"
              placeholder="0,00"
            />
            {errors.amount && (
              <div className="text-xs text-danger mt-1">{errors.amount.message}</div>
            )}
          </div>

          <div>
            <Label className="mb-1.5 block">Date *</Label>
            <Input type="date" {...form.register('expense_date')} />
            {errors.expense_date && (
              <div className="text-xs text-danger mt-1">{errors.expense_date.message}</div>
            )}
          </div>

          <div>
            <Label className="mb-1.5 block">Catégorie *</Label>
            <Input
              {...form.register('category')}
              list="expense-categories"
              placeholder="Ex: Logiciels, Transport, Restauration…"
            />
            <datalist id="expense-categories">
              {(categories ?? []).map((c) => <option key={c} value={c} />)}
            </datalist>
            {errors.category && (
              <div className="text-xs text-danger mt-1">{errors.category.message}</div>
            )}
          </div>

          <div>
            <Label className="mb-1.5 block">Description *</Label>
            <textarea
              {...form.register('description')}
              rows={3}
              aria-label="Description"
              className={cn(
                'w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted',
                'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20'
              )}
            />
            {errors.description && (
              <div className="text-xs text-danger mt-1">{errors.description.message}</div>
            )}
          </div>

          <div>
            <Label className="mb-1.5 block">Justificatif (optionnel)</Label>
            <Controller
              control={form.control}
              name="file"
              render={({ field, fieldState }) => (
                <FileUploadZone
                  value={field.value ?? null}
                  onChange={(f) => {
                    field.onChange(f ?? undefined)
                    if (f) form.setValue('removeReceipt', false)
                  }}
                  currentFile={currentFile}
                  error={fieldState.error?.message}
                  disabled={isPending}
                  acceptedMimes={RECEIPT_ACCEPTED_MIMES}
                  maxSizeBytes={RECEIPT_MAX_SIZE_BYTES}
                  acceptAttr={RECEIPT_ACCEPT_ATTR}
                  helpText="PDF, JPG, PNG · 5 Mo max"
                  tooLargeMessage="Fichier trop volumineux (max 5 Mo)"
                  unsupportedMessage="Format non supporté (PDF, JPG, PNG uniquement)"
                />
              )}
            />
            {isEdit && currentFile && (
              <label className="inline-flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...form.register('removeReceipt')}
                  className="h-4 w-4 accent-accent"
                />
                <span className="text-xs text-muted">
                  Supprimer le justificatif existant
                </span>
              </label>
            )}
          </div>
        </form>
      )}
    </Drawer>
  )
}
