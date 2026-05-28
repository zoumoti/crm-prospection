import { cn } from '@/lib/utils'
import { APP_INITIAL } from '@/config/brand'

interface LogoProps {
  size?: number
  className?: string
}

export function Logo({ size = 32, className }: LogoProps) {
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      className={cn(
        'rounded-lg bg-accent flex items-center justify-center text-white font-bold shrink-0',
        className
      )}
    >
      {APP_INITIAL}
    </div>
  )
}
