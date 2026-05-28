import { useEffect, useState } from 'react'

interface ImportedPdfPreviewProps {
  file: File
}

// Renders an in-memory PDF (an imported File the user just picked) using the
// browser's native viewer via a blob: URL. Revokes the URL on unmount so the
// blob is GC-eligible.
export function ImportedPdfPreview({ file }: ImportedPdfPreviewProps) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    const next = URL.createObjectURL(file)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [file])

  if (!url) return null

  return (
    <iframe
      title="Aperçu du PDF importé"
      src={url}
      className="w-full h-full bg-bg border-0"
    />
  )
}
