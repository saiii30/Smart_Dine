import { useState, useEffect, useRef } from 'react'
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
  CalendarClock,
  LogOut,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeft,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: null },
  { to: '/tables', label: 'Tables', icon: UtensilsCrossed, roles: null },
  { to: '/menu', label: 'Menu', icon: ClipboardList, roles: null },
  { to: '/menu-scheduler', label: 'Scheduler', icon: CalendarClock, roles: ['ADMIN', 'MANAGER'] },
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
  const [mobileOpen, setMobileOpen] = useState(false)
  const loc = useLocation()
  const mainRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0
    }
  }, [loc.pathname])

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
    <div className={`flex h-screen overflow-hidden ${shell}`}>
      {/* MOBILE BACKDROP */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`${sidebar} fixed md:relative z-50 h-full border-r flex flex-col transition-all duration-300 ${
          collapsed ? 'md:w-[72px]' : 'md:w-60'
        } w-64 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-4 flex items-center justify-between border-b border-inherit">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shrink-0" />
            {(!collapsed || mobileOpen) && (
              <div>
                <div className="font-semibold tracking-tight">Smart Dine</div>
                <div className="text-xs opacity-70">Restaurant OS</div>
              </div>
            )}
          </div>
          <button className="md:hidden p-1.5 opacity-70 hover:opacity-100 bg-black/5 dark:bg-white/10 rounded-lg" onClick={() => setMobileOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
          {filtered.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-amber-700 dark:text-amber-300'
                    : 'opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {(!collapsed || mobileOpen) && label}
            </NavLink>
          ))}
        </nav>
        <div className="p-2 border-t border-inherit space-y-1">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm opacity-80 hover:bg-black/5 dark:hover:bg-white/5"
          >
            {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            {!collapsed && 'Collapse'}
          </button>
          <button
            type="button"
            onClick={() => { toggleTheme(); setMobileOpen(false); }}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm opacity-80 hover:bg-black/5 dark:hover:bg-white/5"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            {(!collapsed || mobileOpen) && 'Theme'}
          </button>
          <button
            type="button"
            onClick={() => { logout(); setMobileOpen(false); }}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-500/10"
          >
            <LogOut className="h-5 w-5" />
            {(!collapsed || mobileOpen) && 'Sign out'}
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-14 flex items-center justify-between px-4 sm:px-6 border-b border-black/5 dark:border-white/10 backdrop-blur bg-white/40 dark:bg-slate-900/40 z-30">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden p-2 -ml-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="text-sm font-medium opacity-70 truncate hidden sm:block capitalize">
              {loc.pathname.replace('/', ' ').trim() || 'dashboard'}
            </div>
          </div>
          <div className="text-sm">
            <span className="opacity-60">Signed in as</span>{' '}
            <span className="font-semibold">{user?.full_name}</span>
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-200">
              {user?.role}
            </span>
          </div>
        </header>
        <main ref={mainRef} className="flex-1 p-4 sm:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
