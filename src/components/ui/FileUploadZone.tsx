import { useRef, useState, type DragEvent, type ChangeEvent } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatFileSize } from '@/features/contracts/format'

interface FileUploadZoneProps {
  value: File | null
  onChange: (file: File | null) => void
  currentFile?: { name: string; size: number } | null
  error?: string
  disabled?: boolean
  acceptedMimes: readonly string[]
  maxSizeBytes: number
  acceptAttr: string
  helpText: string
  tooLargeMessage: string
  unsupportedMessage: string
}

export function FileUploadZone({
  value,
  onChange,
  currentFile,
  error,
  disabled,
  acceptedMimes,
  maxSizeBytes,
  acceptAttr,
  helpText,
  tooLargeMessage,
  unsupportedMessage,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [showReplace, setShowReplace] = useState(!currentFile)

  function validateAndSet(file: File | null) {
    setLocalError(null)
    if (!file) {
      onChange(null)
      return
    }
    if (file.size > maxSizeBytes) {
      setLocalError(tooLargeMessage)
      return
    }
    if (!acceptedMimes.includes(file.type)) {
      setLocalError(unsupportedMessage)
      return
    }
    onChange(file)
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    validateAndSet(e.target.files?.[0] ?? null)
    e.target.value = ''
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    validateAndSet(e.dataTransfer.files?.[0] ?? null)
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    if (!disabled) setDragOver(true)
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
  }

  function reset() {
    onChange(null)
    setLocalError(null)
  }

  if (currentFile && !showReplace && !value) {
    return (
      <div>
        <div className="rounded-xl border border-border bg-bg/40 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="h-5 w-5 text-muted shrink-0" />
            <div className="min-w-0">
              <div className="text-sm text-text truncate">{currentFile.name}</div>
              <div className="text-xs text-muted">{formatFileSize(currentFile.size)}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowReplace(true)}
            disabled={disabled}
            className="text-xs text-accent hover:underline shrink-0"
          >
            Remplacer
          </button>
        </div>
        {error && <div className="text-xs text-danger mt-1">{error}</div>}
      </div>
    )
  }

  if (value) {
    return (
      <div>
        <div className="rounded-xl border border-accent/40 bg-accent/5 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="h-5 w-5 text-accent shrink-0" />
            <div className="min-w-0">
              <div className="text-sm text-text truncate">{value.name}</div>
              <div className="text-xs text-muted">{formatFileSize(value.size)}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={reset}
            disabled={disabled}
            aria-label="Retirer le fichier"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted hover:bg-bg transition shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {(error || localError) && (
          <div className="text-xs text-danger mt-1">{error || localError}</div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        className={cn(
          'rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition',
          dragOver ? 'border-accent bg-accent/5' : 'border-border bg-surface',
          disabled && 'opacity-50 pointer-events-none'
        )}
      >
        <Upload className="h-6 w-6 text-muted mx-auto mb-2" />
        <div className="text-sm text-text">Glissez un fichier ou cliquez pour parcourir</div>
        <div className="text-xs text-muted mt-1">{helpText}</div>
        <input
          ref={inputRef}
          type="file"
          accept={acceptAttr}
          onChange={handleChange}
          className="hidden"
          disabled={disabled}
        />
      </div>
      {currentFile && (
        <button
          type="button"
          onClick={() => setShowReplace(false)}
          className="text-xs text-muted hover:text-text mt-1"
        >
          Annuler le remplacement (garder «&nbsp;{currentFile.name}&nbsp;»)
        </button>
      )}
      {(error || localError) && (
        <div className="text-xs text-danger mt-1">{error || localError}</div>
      )}
    </div>
  )
}
