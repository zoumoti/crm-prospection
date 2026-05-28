import { useLogoUrl } from '@/features/settings/hooks'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: number
  className?: string
}

export function Logo({ size = 32, className }: LogoProps) {
  const { data: signedUrl } = useLogoUrl()

  if (signedUrl) {
    return (
      <img
        src={signedUrl}
        alt="Logo entreprise"
        width={size}
        height={size}
        className={cn('rounded-lg object-contain bg-surface', className)}
      />
    )
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      className={cn(
        'rounded-lg bg-accent flex items-center justify-center text-white font-bold shrink-0',
        className
      )}
    >
      B
    </div>
  )
}
