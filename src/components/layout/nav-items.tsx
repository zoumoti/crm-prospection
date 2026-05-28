import {
  LayoutDashboard,
  Users,
  FileText,
  FileSignature,
  Kanban,
  BellRing,
  Wallet,
  Calculator,
  ListTodo,
  Settings,
  Package,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    label: 'GÉNÉRAL',
    items: [{ label: 'Dashboard', path: '/', icon: LayoutDashboard }],
  },
  {
    label: 'CLIENTS',
    items: [
      { label: 'Clients actifs', path: '/clients', icon: Users },
      { label: 'Catalogue produits', path: '/products', icon: Package },
      { label: 'Factures', path: '/invoices', icon: FileText },
      { label: 'Contrats', path: '/contracts', icon: FileSignature },
    ],
  },
  {
    label: 'PROSPECTION',
    items: [
      { label: 'CRM Pipeline', path: '/crm/pipeline', icon: Kanban },
      { label: 'Relances', path: '/crm/followups', icon: BellRing },
    ],
  },
  {
    label: 'FINANCE',
    items: [
      { label: 'Revenus & Dépenses', path: '/finance/revenue', icon: Wallet },
      { label: 'Cotisations', path: '/finance/cotisations', icon: Calculator },
    ],
  },
  {
    label: 'TÂCHES',
    items: [{ label: 'Mes tâches', path: '/tasks', icon: ListTodo }],
  },
  {
    label: 'SYSTÈME',
    items: [{ label: 'Paramètres', path: '/settings', icon: Settings }],
  },
]
