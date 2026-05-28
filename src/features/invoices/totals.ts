export function calculateLineTotal(unitPriceHt: number, quantity: number): number {
  return Math.round(unitPriceHt * quantity * 100) / 100
}

export function calculateInvoiceTotal(
  lines: { unit_price_ht: number; quantity: number }[]
): number {
  return Math.round(
    lines.reduce((sum, l) => sum + l.unit_price_ht * l.quantity, 0) * 100
  ) / 100
}

export function formatCurrency(amount: number): string {
  // Intl uses narrow no-break space (U+202F) and no-break space (U+00A0) for fr-FR
  // separators. These render as "/" or boxes in the PDF font (Helvetica). Normalize
  // them to regular spaces so the same string renders correctly in app UI AND PDF.
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(amount)
    .replace(/[  ]/g, ' ')
}

export function formatDateShort(iso: string | null): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
