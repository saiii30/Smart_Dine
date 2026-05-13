import { useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  UtensilsCrossed,
  ClipboardList,
  ChefHat,
  Receipt,
  Package,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: null },
  { to: '/tables', label: 'Tables', icon: UtensilsCrossed, roles: null },
  { to: '/menu', label: 'Menu', icon: ClipboardList, roles: null },
  { to: '/orders', label: 'Orders', icon: ClipboardList, roles: ['ADMIN', 'MANAGER', 'WAITER', 'CASHIER'] },
  { to: '/kitchen', label: 'Kitchen', icon: ChefHat, roles: ['ADMIN', 'MANAGER', 'KITCHEN'] },
  { to: '/billing', label: 'Billing', icon: Receipt, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { to: '/inventory', label: 'Inventory', icon: Package, roles: null },
  { to: '/employees', label: 'Team', icon: Users, roles: ['ADMIN', 'MANAGER'] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: null },
]

const Layout = () => {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [collapsed, setCollapsed] = useState(false)
  const loc = useLocation()

  const role = user?.role || ''
  const filtered = nav.filter((n) => !n.roles || n.roles.includes(role as (typeof n.roles)[number]))

  const shell =
    theme === 'dark'
      ? 'bg-slate-950 text-slate-100 min-h-screen'
      : 'bg-gradient-to-br from-amber-50 via-white to-orange-50 text-slate-900 min-h-screen'

  const sidebar =
    theme === 'dark'
      ? 'bg-slate-900/90 border-slate-800'
      : 'bg-white/80 border-amber-100 shadow-xl shadow-amber-900/5'

  return (
    <div className={`flex ${shell}`}>
      <aside
        className={`${sidebar} border-r flex flex-col transition-all duration-300 ${
          collapsed ? 'w-[72px]' : 'w-60'
        }`}
      >
        <div className="p-4 flex items-center gap-2 border-b border-inherit">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shrink-0" />
          {!collapsed && (
            <div>
              <div className="font-semibold tracking-tight">Smart Dine</div>
              <div className="text-xs opacity-70">Restaurant OS</div>
            </div>
          )}
        </div>
        <nav className="flex-1 py-3 space-y-0.5 px-2">
          {filtered.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-amber-700 dark:text-amber-300'
                    : 'opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>
        <div className="p-2 border-t border-inherit space-y-1">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm opacity-80 hover:bg-black/5 dark:hover:bg-white/5"
          >
            {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            {!collapsed && 'Collapse'}
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm opacity-80 hover:bg-black/5 dark:hover:bg-white/5"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            {!collapsed && 'Theme'}
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-500/10"
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && 'Sign out'}
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center justify-between px-6 border-b border-black/5 dark:border-white/10 backdrop-blur bg-white/40 dark:bg-slate-900/40">
          <div className="text-sm font-medium opacity-70 truncate">
            {loc.pathname.replace('/', ' ').trim() || 'dashboard'}
          </div>
          <div className="text-sm">
            <span className="opacity-60">Signed in as</span>{' '}
            <span className="font-semibold">{user?.full_name}</span>
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-200">
              {user?.role}
            </span>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
