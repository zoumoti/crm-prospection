import type { Invoice } from '@/types/database'

export type DisplayStatus = 'pending' | 'paid' | 'late'

export function computeDisplayStatus(
  invoice: Pick<Invoice, 'status' | 'due_date'>
): DisplayStatus {
  if (invoice.status === 'paid') return 'paid'
  if (invoice.due_date) {
    const due = new Date(invoice.due_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (due < today) return 'late'
  }
  return 'pending'
}

export function displayStatusLabel(status: DisplayStatus): string {
  switch (status) {
    case 'pending':
      return 'En attente'
    case 'paid':
      return 'Payée'
    case 'late':
      return 'En retard'
  }
}
