// src/pages/dashboard/components/WidgetSkeleton.tsx
//
// Three skeleton variants matching the widget shapes. Pulses via Tailwind
// `animate-pulse`. Used as the body of WidgetCard when loading.

export type SkeletonVariant = 'kpi' | 'kpi-sparkline' | 'list'

interface WidgetSkeletonProps {
  variant: SkeletonVariant
}

export function WidgetSkeleton({ variant }: WidgetSkeletonProps) {
  if (variant === 'kpi') {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-8 w-32 rounded bg-muted" />
        <div className="h-4 w-20 rounded bg-muted/60" />
      </div>
    )
  }
  if (variant === 'kpi-sparkline') {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-8 w-32 rounded bg-muted" />
        <div className="h-4 w-24 rounded bg-muted/60" />
        <div className="h-16 w-full rounded bg-muted/40" />
      </div>
    )
  }
  // list
  return (
    <div className="space-y-2 animate-pulse">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="h-9 w-full rounded bg-muted/60" />
      ))}
    </div>
  )
}
