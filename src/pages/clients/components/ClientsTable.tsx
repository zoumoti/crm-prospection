import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Client } from '@/types/database'

interface ClientsTableProps {
  clients: Client[]
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return format(new Date(iso), 'd MMM yyyy', { locale: fr })
  } catch {
    return '—'
  }
}

export function ClientsTable({ clients }: ClientsTableProps) {
  const navigate = useNavigate()

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-border/40 bg-surface shadow-card">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs font-semibold tracking-wider text-muted uppercase border-b border-border">
              <th className="px-5 py-3">Nom</th>
              <th className="px-5 py-3">Entreprise</th>
              <th className="px-5 py-3">Code</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Début</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr
                key={c.id}
                onClick={() => navigate(`/clients/${c.id}`)}
                className="border-b border-border/60 last:border-b-0 hover:bg-bg cursor-pointer transition"
              >
                <td className="px-5 py-3 text-sm font-medium text-text">
                  {c.first_name} {c.last_name}
                </td>
                <td className="px-5 py-3 text-sm text-muted">{c.company ?? '—'}</td>
                <td className="px-5 py-3 text-sm text-muted font-mono">{c.code_client}</td>
                <td className="px-5 py-3 text-sm text-muted">{c.email ?? '—'}</td>
                <td className="px-5 py-3 text-sm text-muted">{formatDate(c.start_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {clients.map((c) => {
          const hasContactRow = c.email || c.start_date
          return (
            <button
              key={c.id}
              onClick={() => navigate(`/clients/${c.id}`)}
              className="w-full text-left bg-surface rounded-2xl border border-border/40 shadow-card p-4 hover:bg-bg transition"
            >
              <div className="text-sm font-semibold text-text">
                {c.first_name} {c.last_name}
              </div>
              <div className="text-xs text-muted mt-1">
                {c.company && <>{c.company} · </>}
                <span className="font-mono">{c.code_client}</span>
              </div>
              {hasContactRow && (
                <div className="text-xs text-muted mt-2 flex items-center justify-between gap-2">
                  {c.email && <span className="truncate">{c.email}</span>}
                  {c.start_date && (
                    <span className="shrink-0 ml-auto">{formatDate(c.start_date)}</span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </>
  )
}
