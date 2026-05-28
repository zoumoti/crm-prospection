import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Sun, Moon, LogOut, Settings, User as UserIcon, Menu } from 'lucide-react'
import { navGroups } from './nav-items'
import { useTheme } from '@/stores/theme'
import { useAuth } from '@/stores/auth'
import { cn } from '@/lib/utils'

interface HeaderProps {
  onOpenMenu?: () => void
}

function getPageTitle(pathname: string): string {
  for (const group of navGroups) {
    for (const item of group.items) {
      if (item.path === pathname) return item.label
      // prefix match for nested routes (e.g. /clients/123 → "Clients actifs")
      if (pathname.startsWith(item.path + '/') && item.path !== '/') return item.label
    }
  }
  if (pathname === '/') return 'Dashboard'
  return ''
}

export function Header({ onOpenMenu }: HeaderProps) {
  const { pathname } = useLocation()
  const { mode, toggle } = useTheme()
  const { user, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
      <div className="flex items-center gap-2 min-w-0">
        {onOpenMenu && (
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Ouvrir le menu"
            className="md:hidden h-10 w-10 rounded-xl flex items-center justify-center text-muted hover:bg-bg transition"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <h1 className="text-lg font-semibold text-text truncate">{getPageTitle(pathname)}</h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          aria-label={mode === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
          className="h-10 w-10 rounded-xl flex items-center justify-center text-muted hover:bg-bg transition"
        >
          {mode === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu utilisateur"
            className="h-10 w-10 rounded-full bg-accent-soft text-accent flex items-center justify-center hover:bg-accent-soft/70 transition"
          >
            <UserIcon className="h-5 w-5" />
          </button>

          {menuOpen && (
            <div className={cn(
              'absolute right-0 mt-2 w-64 rounded-xl bg-surface border border-border shadow-card p-2 z-50'
            )}>
              <div className="px-3 py-2 border-b border-border">
                <div className="text-xs text-muted">Connecté en tant que</div>
                <div className="text-sm font-medium text-text truncate">{user?.email ?? '—'}</div>
              </div>
              <Link
                to="/settings"
                onClick={() => setMenuOpen(false)}
                className="w-full mt-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text hover:bg-bg transition"
              >
                <Settings className="h-4 w-4" />
                Paramètres
              </Link>
              <button
                onClick={() => {
                  setMenuOpen(false)
                  signOut()
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text hover:bg-bg transition"
              >
                <LogOut className="h-4 w-4" />
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
