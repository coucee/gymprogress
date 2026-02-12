import { ChartSpline, Home, ListChecks, NotebookTabs } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '../lib/utils.js'

const tabs = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/progress', label: 'Progress', icon: ChartSpline },
  { to: '/habits', label: 'Habits', icon: ListChecks },
  { to: '/plans', label: 'Plans', icon: NotebookTabs },
]

export function MobileBottomNav() {
  const location = useLocation()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
      <ul className="grid grid-cols-4">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = location.pathname === tab.to || (tab.to === '/dashboard' && location.pathname === '/')
          return (
            <li key={tab.to}>
              <Link
                className={cn(
                  'flex flex-col items-center gap-1 px-2 py-2 text-[11px] font-medium',
                  active ? 'text-blue-600' : 'text-slate-500',
                )}
                to={tab.to}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
