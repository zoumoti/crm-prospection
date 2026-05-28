import {
  LayoutDashboard,
  Kanban,
  BellRing,
  Settings,
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
    label: 'PROSPECTION',
    items: [
      { label: 'CRM Pipeline', path: '/crm/pipeline', icon: Kanban },
      { label: 'Relances', path: '/crm/followups', icon: BellRing },
    ],
  },
  {
    label: 'SYSTÈME',
    items: [{ label: 'Paramètres', path: '/settings', icon: Settings }],
  },
]
