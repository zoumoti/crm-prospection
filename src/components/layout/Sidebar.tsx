import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/ui/Logo'
import { navGroups } from './nav-items'

interface SidebarProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
      {navGroups.map((group) => (
        <div key={group.label}>
          <div className="text-[11px] font-semibold tracking-wider text-muted px-3 mb-2">
            {group.label}
          </div>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition',
                        isActive
                          ? 'bg-accent-soft text-accent font-medium'
                          : 'text-text/80 hover:bg-bg'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-accent" />
                        )}
                        <Icon className="h-5 w-5 shrink-0" />
                        <span>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  // Lock body scroll while mobile drawer is open
  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileOpen])

  // Close mobile drawer on Escape
  useEffect(() => {
    if (!mobileOpen || !onMobileClose) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onMobileClose!()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mobileOpen, onMobileClose])

  return (
    <>
      {/* Desktop sidebar (always visible from md up) */}
      <aside className="hidden md:flex md:flex-col fixed inset-y-0 left-0 w-[220px] bg-surface border-r border-border z-30">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-border">
          <Logo size={32} />
          <span className="font-semibold text-text">Business OS</span>
        </div>
        <NavContent />
      </aside>

      {/* Mobile drawer (only mounted when open, slides from the left) */}
      <div
        className={cn(
          'md:hidden fixed inset-0 z-40 transition-opacity duration-200',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        aria-hidden={!mobileOpen}
      >
        <div
          onClick={onMobileClose}
          className="absolute inset-0 bg-black/40"
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          className={cn(
            'absolute left-0 top-0 h-full w-[260px] max-w-[80vw] bg-surface shadow-card flex flex-col',
            'transition-transform duration-200 ease-out',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="h-16 flex items-center justify-between gap-2 px-5 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <Logo size={32} />
              <span className="font-semibold text-text">Business OS</span>
            </div>
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Fermer le menu"
              className="h-10 w-10 rounded-xl flex items-center justify-center text-muted hover:bg-bg transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <NavContent onNavigate={onMobileClose} />
        </aside>
      </div>
    </>
  )
}
