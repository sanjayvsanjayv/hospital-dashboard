import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, FlaskConical, Bell, TrendingUp,
  BarChart3, Shield, LogOut, Menu, X, Activity, ChevronRight,
  AlertTriangle, GitCompare, Plug
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/dashboard',   label: 'Dashboard',     icon: LayoutDashboard, roles: ['admin','doctor','nurse','lab','specialist'] },
  { to: '/patients',    label: 'Patients',       icon: Users,            roles: ['admin','doctor','nurse','specialist'] },
  { to: '/tests',       label: 'Diagnostics',    icon: FlaskConical,     roles: ['admin','doctor','nurse','lab'] },
  { to: '/alerts',      label: 'Alerts',         icon: Bell,             roles: ['admin','doctor','nurse','lab','specialist'] },
  { to: '/baseline',    label: 'Baseline vs Proposed', icon: GitCompare, roles: ['admin','doctor'] },
  { to: '/error-analysis', label: 'Error Analysis', icon: BarChart3,     roles: ['admin','doctor'] },
  { to: '/consent',     label: 'Consent & Privacy', icon: Shield,        roles: ['admin','doctor','nurse'] },
  { to: '/integration', label: 'Integration Stubs', icon: Plug,          roles: ['admin'] },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const role = user?.role || 'nurse'
  const visibleNav = NAV.filter(n => n.roles.includes(role))

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const ROLE_COLORS = {
    admin: 'bg-purple-100 text-purple-800',
    doctor: 'bg-blue-100 text-blue-800',
    nurse: 'bg-green-100 text-green-800',
    lab: 'bg-orange-100 text-orange-800',
    specialist: 'bg-red-100 text-red-800',
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static z-30 h-full w-64 bg-slate-900 text-white flex flex-col
        transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-700">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <Activity size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">District Hospital</p>
            <p className="text-xs text-slate-400 leading-tight">Diagnostic Dashboard</p>
          </div>
          <button className="ml-auto lg:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* User pill */}
        <div className="mx-4 mt-4 px-3 py-2 rounded-lg bg-slate-800 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">
            {(user?.name || 'U')[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{user?.name || user?.username}</p>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase ${ROLE_COLORS[role] || 'bg-slate-700 text-slate-200'}`}>
              {role}
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5 scrollbar-thin">
          {visibleNav.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to))
            return (
              <Link key={to} to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${active ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={17} />
                {label}
                {active && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            )
          })}
        </nav>

        {/* Prototype warning */}
        <div className="mx-4 mb-3 px-3 py-2 rounded-lg bg-amber-900/50 border border-amber-700/50">
          <div className="flex items-center gap-2">
            <AlertTriangle size={13} className="text-amber-400 shrink-0" />
            <p className="text-[10px] text-amber-300 font-medium">PROTOTYPE — Synthetic data only</p>
          </div>
        </div>

        {/* Logout */}
        <div className="px-3 pb-4">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-red-900/50 hover:text-red-300 transition-colors">
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3 shrink-0">
          <button className="lg:hidden text-slate-600 hover:text-slate-900" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <div>
            <h1 className="text-sm font-semibold text-slate-800">
              {visibleNav.find(n => location.pathname.startsWith(n.to))?.label || 'Dashboard'}
            </h1>
            <p className="text-xs text-slate-400">Diagnostic-Delay Early-Warning System</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:block">
              {new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
            </span>
            <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-green-700">Live</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
