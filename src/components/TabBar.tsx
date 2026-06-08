import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LayoutGrid, LineChart, Trophy, Settings, Plus } from 'lucide-react'

const sideTabs = [
  { to: '/', label: 'Today', icon: LayoutGrid, end: true },
  { to: '/progress', label: 'Progress', icon: LineChart, end: false },
]

const rightTabs = [
  { to: '/achievements', label: 'Achievements', icon: Trophy, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
]

export function TabBar() {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (to: string, end?: boolean) => {
    if (end) return location.pathname === to
    return location.pathname.startsWith(to)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
      <div className="mx-auto flex max-w-md items-end justify-between rounded-full bg-surface px-3 py-2 shadow-card">
        {sideTabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={`flex min-w-[64px] flex-col items-center gap-0.5 px-2 py-1.5 text-[10px] font-bold transition-colors ${
              isActive(to, end) ? 'text-accent-deep' : 'text-muted'
            }`}
          >
            <Icon size={22} strokeWidth={isActive(to, end) ? 2.5 : 2} />
            <span>{label}</span>
          </NavLink>
        ))}

        <button
          type="button"
          onClick={() => navigate('/progress#check-in')}
          className="-mt-6 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-foreground shadow-card ring-4 ring-background"
          aria-label="Quick check-in"
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>

        {rightTabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={`flex min-w-[64px] flex-col items-center gap-0.5 px-2 py-1.5 text-[10px] font-bold transition-colors ${
              isActive(to, end) ? 'text-accent-deep' : 'text-muted'
            }`}
          >
            <Icon size={22} strokeWidth={isActive(to, end) ? 2.5 : 2} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
