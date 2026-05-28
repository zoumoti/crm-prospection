import { pdf } from '@react-pdf/renderer'
import { supabase } from '@/lib/supabase'
import { InvoicePdf, type InvoicePdfProps } from './InvoicePdf'

export async function fetchLogoAsBase64(logoPath: string | null): Promise<string | null> {
  if (!logoPath) return null
  const { data, error } = await supabase.storage
    .from('company-assets')
    .download(logoPath)
  if (error || !data) return null
  return await blobToDataUrl(data)
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export async function downloadInvoicePdf(props: InvoicePdfProps): Promise<void> {
  const blob = await pdf(<InvoicePdf {...props} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.invoice.invoice_number}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
