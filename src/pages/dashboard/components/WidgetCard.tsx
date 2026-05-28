// src/pages/dashboard/components/WidgetCard.tsx
//
// Uniform card primitive for every dashboard widget. Handles loading / error /
// empty states; body is rendered only when none of those apply.
//
// Visual base: src/components/ui/Card.tsx convention
// (`bg-surface rounded-2xl shadow-card border border-border/40`) with p-5
// for tighter widget density + flex-col + h-full so cards in a CSS grid row
// align to the tallest sibling.

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WidgetSkeleton, type SkeletonVariant } from './WidgetSkeleton'

interface WidgetCardProps {
  title: string
  icon?: ReactNode                      // lucide icon, rendered top-right
  loading?: boolean
  skeletonVariant?: SkeletonVariant
  error?: Error | null
  onRetry?: () => void
  isEmpty?: boolean
  emptyMessage?: string
  emptyAction?: { label: string; href: string }
  footerLabel?: string                  // 'Voir toutes (3) →'
  footerHref?: string
  children?: ReactNode
  className?: string
}

export function WidgetCard({
  title,
  icon,
  loading,
  skeletonVariant = 'kpi',
  error,
  onRetry,
  isEmpty,
  emptyMessage,
  emptyAction,
  footerLabel,
  footerHref,
  children,
  className,
}: WidgetCardProps) {
  const showSkeleton = loading
  const showError = !loading && error != null
  const showEmpty = !loading && !error && isEmpty
  const showBody = !loading && !error && !isEmpty

  return (
    <div
      className={cn(
        'bg-surface rounded-2xl shadow-card border border-border/40 p-5 flex flex-col h-full min-h-0',
        className
      )}
    >
      <header className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-muted">{title}</h2>
        {icon ? <div className="text-muted shrink-0">{icon}</div> : null}
      </header>

      <div className="flex-1 min-h-0">
        {showSkeleton ? <WidgetSkeleton variant={skeletonVariant} /> : null}

        {showError ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2 text-sm text-muted">
            <AlertCircle className="h-5 w-5 text-danger" aria-hidden />
            <span>Erreur de chargement</span>
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="mt-1 px-3 py-1.5 rounded-lg text-xs bg-muted hover:bg-bg transition"
              >
                Réessayer
              </button>
            ) : null}
          </div>
        ) : null}

        {showEmpty ? (
          <div className="flex flex-col items-center justify-center py-6 text-sm text-muted text-center gap-2">
            <span>{emptyMessage}</span>
            {emptyAction ? (
              <Link
                to={emptyAction.href}
                className="text-accent hover:underline text-sm font-medium inline-flex items-center gap-1"
              >
                {emptyAction.label}
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            ) : null}
          </div>
        ) : null}

        {showBody ? children : null}
      </div>

      {/* Footer: visible only when body is rendered (not on loading/error/empty) */}
      {showBody && footerLabel && footerHref ? (
        <footer className="mt-4 pt-3 border-t border-border/40">
          <Link
            to={footerHref}
            className="text-sm text-accent hover:underline inline-flex items-center gap-1"
          >
            {footerLabel}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </footer>
      ) : null}
    </div>
  )
}
