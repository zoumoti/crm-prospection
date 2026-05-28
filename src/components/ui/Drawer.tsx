import { type ReactNode, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

export function Drawer({ open, onClose, title, children, footer }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const firstInputRef = useRef<HTMLElement | null>(null)

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Autofocus the first focusable element on open
  useEffect(() => {
    if (!open || !panelRef.current) return
    const focusables = panelRef.current.querySelectorAll<HTMLElement>(
      'input:not([type="hidden"]), textarea, select, button:not([data-drawer-close])'
    )
    firstInputRef.current = focusables[0] ?? null
    firstInputRef.current?.focus()
  }, [open])

  return (
    <div
      className={cn(
        'fixed inset-0 z-40 transition-opacity duration-200',
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      )}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'absolute right-0 top-0 h-full w-full md:w-[480px] bg-surface shadow-card',
          'flex flex-col',
          'transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="h-16 px-5 flex items-center justify-between border-b border-border shrink-0">
          <h2 className="text-lg font-semibold text-text">{title}</h2>
          <button
            data-drawer-close
            onClick={onClose}
            aria-label="Fermer"
            className="h-10 w-10 rounded-xl flex items-center justify-center text-muted hover:bg-bg transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>

        {footer && (
          <div className="px-5 py-4 border-t border-border bg-surface shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
