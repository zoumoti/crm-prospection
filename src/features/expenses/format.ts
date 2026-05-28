const EUR = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
})

export function formatExpenseAmount(amount: number): string {
  return EUR.format(amount)
}

export function isImageMime(mime: string | null | undefined): boolean {
  if (!mime) return false
  return mime.startsWith('image/')
}
