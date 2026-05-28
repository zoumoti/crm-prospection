import { Paperclip, MoreVertical, Pencil, Trash2, ExternalLink } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { formatExpenseAmount } from './format'
import type { Expense, Invoice, Client } from '@/types/database'

export interface RevenueRow {
  kind: 'revenue'
  date: string  // 'YYYY-MM-DD'
  invoice: Invoice
  client: Client | undefined
}

export interface ExpenseRow {
  kind: 'expense'
  date: string
  expense: Expense
}

export type TransactionRow = RevenueRow | ExpenseRow

interface TransactionsListProps {
  rows: TransactionRow[]
  onEditExpense: (id: string) => void
  onDeleteExpense: (id: string) => void
  onViewReceipt: (storagePath: string) => void
}

function formatDate(d: string): string {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export function TransactionsList({
  rows,
  onEditExpense,
  onDeleteExpense,
  onViewReceipt,
}: TransactionsListProps) {
  if (rows.length === 0) {
    return (
      <div className="text-center text-muted py-12 text-sm">
        Aucune transaction ce mois-ci.
      </div>
    )
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-border">
              <th className="py-2 px-3 font-medium">Date</th>
              <th className="py-2 px-3 font-medium">Type</th>
              <th className="py-2 px-3 font-medium">Description</th>
              <th className="py-2 px-3 font-medium text-right">Montant</th>
              <th className="py-2 px-3 font-medium w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <TableRow
                key={`${row.kind}-${idx}`}
                row={row}
                onEditExpense={onEditExpense}
                onDeleteExpense={onDeleteExpense}
                onViewReceipt={onViewReceipt}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {rows.map((row, idx) => (
          <CardRow
            key={`${row.kind}-${idx}`}
            row={row}
            onEditExpense={onEditExpense}
            onDeleteExpense={onDeleteExpense}
            onViewReceipt={onViewReceipt}
          />
        ))}
      </div>
    </>
  )
}

function TypeBadge({ kind }: { kind: 'revenue' | 'expense' }) {
  if (kind === 'revenue') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-accent/15 text-accent">
        Revenu
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-danger/10 text-danger">
      Dépense
    </span>
  )
}

function descriptionForRow(row: TransactionRow): React.ReactNode {
  if (row.kind === 'revenue') {
    const cName = row.client
      ? `${row.client.first_name} ${row.client.last_name}`
      : '—'
    return (
      <Link
        to={`/invoices/${row.invoice.id}`}
        className="text-text hover:underline inline-flex items-center gap-1"
      >
        Facture {row.invoice.invoice_number} — {cName}
        <ExternalLink className="h-3 w-3 inline" />
      </Link>
    )
  }
  return (
    <span className="text-text">
      <span className="font-medium">{row.expense.category}</span>
      {row.expense.description ? ` — ${row.expense.description}` : ''}
      {row.expense.storage_path && (
        <Paperclip className="h-3 w-3 inline ml-1 text-muted" />
      )}
    </span>
  )
}

function amountFor(row: TransactionRow): { value: number; sign: '+' | '-' } {
  if (row.kind === 'revenue') return { value: row.invoice.total_ht, sign: '+' }
  return { value: row.expense.amount, sign: '-' }
}

function RowActions({
  row,
  onEditExpense,
  onDeleteExpense,
  onViewReceipt,
}: {
  row: TransactionRow
  onEditExpense: (id: string) => void
  onDeleteExpense: (id: string) => void
  onViewReceipt: (storagePath: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [openUp, setOpenUp] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  if (row.kind === 'revenue') {
    return null
  }

  // Estimated menu height: ~3 items × 36px + padding = ~120-160px. Use 200px to be safe.
  const ESTIMATED_MENU_HEIGHT = 200

  function toggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      setOpenUp(spaceBelow < ESTIMATED_MENU_HEIGHT)
    }
    setOpen((o) => !o)
  }

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label="Actions"
        className="h-11 w-11 rounded-xl flex items-center justify-center text-muted hover:bg-bg cursor-pointer"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className={`absolute right-0 z-20 w-56 rounded-xl bg-surface border border-border shadow-card py-1 ${openUp ? 'bottom-12' : 'top-12'}`}>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onEditExpense(row.expense.id)
            }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-bg flex items-center gap-2"
          >
            <Pencil className="h-4 w-4 text-muted" /> Modifier
          </button>
          {row.expense.storage_path && (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onViewReceipt(row.expense.storage_path!)
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-bg flex items-center gap-2"
            >
              <Paperclip className="h-4 w-4 text-muted" /> Voir le justificatif
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onDeleteExpense(row.expense.id)
            }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-bg flex items-center gap-2 text-danger"
          >
            <Trash2 className="h-4 w-4" /> Supprimer
          </button>
        </div>
      )}
    </div>
  )
}

function TableRow({
  row,
  onEditExpense,
  onDeleteExpense,
  onViewReceipt,
}: {
  row: TransactionRow
  onEditExpense: (id: string) => void
  onDeleteExpense: (id: string) => void
  onViewReceipt: (storagePath: string) => void
}) {
  const a = amountFor(row)
  return (
    <tr className="border-b border-border/40 last:border-b-0">
      <td className="py-2 px-3 whitespace-nowrap text-muted">{formatDate(row.date)}</td>
      <td className="py-2 px-3"><TypeBadge kind={row.kind} /></td>
      <td className="py-2 px-3">{descriptionForRow(row)}</td>
      <td className={`py-2 px-3 text-right font-medium ${row.kind === 'expense' ? 'text-danger' : 'text-accent'}`}>
        {a.sign} {formatExpenseAmount(a.value)}
      </td>
      <td className="py-2 px-3">
        <RowActions
          row={row}
          onEditExpense={onEditExpense}
          onDeleteExpense={onDeleteExpense}
          onViewReceipt={onViewReceipt}
        />
      </td>
    </tr>
  )
}

function CardRow({
  row,
  onEditExpense,
  onDeleteExpense,
  onViewReceipt,
}: {
  row: TransactionRow
  onEditExpense: (id: string) => void
  onDeleteExpense: (id: string) => void
  onViewReceipt: (storagePath: string) => void
}) {
  const a = amountFor(row)
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <TypeBadge kind={row.kind} />
          <span className="text-xs text-muted shrink-0">{formatDate(row.date)}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div className={`text-base font-semibold ${row.kind === 'expense' ? 'text-danger' : 'text-accent'}`}>
            {a.sign} {formatExpenseAmount(a.value)}
          </div>
          {row.kind === 'expense' && (
            <RowActions
              row={row}
              onEditExpense={onEditExpense}
              onDeleteExpense={onDeleteExpense}
              onViewReceipt={onViewReceipt}
            />
          )}
        </div>
      </div>
      <div className="text-sm text-text break-words pr-1">{descriptionForRow(row)}</div>
    </div>
  )
}
