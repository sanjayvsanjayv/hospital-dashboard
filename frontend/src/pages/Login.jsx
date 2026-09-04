import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, Eye, EyeOff, AlertCircle, Lock, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const DEMO_ACCOUNTS = [
  { username: 'admin',      password: 'admin123',      role: 'Admin',      color: 'purple' },
  { username: 'doctor',     password: 'doctor123',     role: 'Doctor',     color: 'blue'   },
  { username: 'nurse',      password: 'nurse123',      role: 'Nurse',      color: 'green'  },
  { username: 'lab',        password: 'lab123',        role: 'Lab/Scan',   color: 'orange' },
  { username: 'specialist', password: 'specialist123', role: 'Specialist', color: 'red'    },
]

const COLOR_MAP = {
  purple: 'bg-purple-50 border-purple-200 hover:bg-purple-100 text-purple-700',
  blue:   'bg-blue-50   border-blue-200   hover:bg-blue-100   text-blue-700',
  green:  'bg-green-50  border-green-200  hover:bg-green-100  text-green-700',
  orange: 'bg-orange-50 border-orange-200 hover:bg-orange-100 text-orange-700',
  red:    'bg-red-50    border-red-200    hover:bg-red-100    text-red-700',
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm]     = useState({ username: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.username || !form.password) {
      setError('Please enter your username and password.')
      return
    }
    setLoading(true)
    try {
      await login(form.username, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  function fillDemo(acc) {
    setForm({ username: acc.username, password: acc.password })
    setError('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Hospital branding */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-900/50">
            <Activity size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">District Hospital</h1>
          <p className="text-blue-300 text-sm mt-1">Diagnostic-Delay Early-Warning Dashboard</p>
          <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-900/40 border border-amber-700/50 rounded-full px-3 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-xs text-amber-300 font-medium">PROTOTYPE — Synthetic Data Only</span>
          </div>
        </div>

        {/* Login card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-5">Sign in to your account</h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg px-3 py-2.5 mb-4 text-sm">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Username</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  placeholder="Enter username"
                  autoComplete="username"
                  className="w-full pl-9 pr-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  className="w-full pl-9 pr-10 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold rounded-lg text-sm transition shadow-lg shadow-blue-900/40">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6">
            <p className="text-xs text-slate-400 font-medium mb-3 flex items-center gap-2">
              <span className="flex-1 h-px bg-white/10" />
              DEMO ACCOUNTS — Click to auto-fill
              <span className="flex-1 h-px bg-white/10" />
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {DEMO_ACCOUNTS.map(acc => (
                <button key={acc.username} onClick={() => fillDemo(acc)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition cursor-pointer ${COLOR_MAP[acc.color]}`}>
                  <span className="text-base">{
                    { Admin: '👤', Doctor: '🩺', Nurse: '💊', 'Lab/Scan': '🧪', Specialist: '🔬' }[acc.role]
                  }</span>
                  <span>{acc.role}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">
              Credentials: role / role + "123" (e.g. admin / admin123)
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-4">
          COE Project — Prototype. Not for clinical use. All patient data is synthetic.
        </p>
      </div>
    </div>
  )
}
