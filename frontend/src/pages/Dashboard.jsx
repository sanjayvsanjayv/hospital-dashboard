import { useEffect, useState, useCallback } from 'react'
import {
  Users, Bed, FlaskConical, AlertTriangle, Clock, Activity,
  TrendingDown, ShieldAlert, RefreshCw, Info
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts'
import { getDashboard, getMetrics } from '../api'
import StatCard from '../components/StatCard'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

const PIE_COLORS = { HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#22c55e' }

export default function Dashboard() {
  const [dash, setDash]     = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [d, m] = await Promise.all([getDashboard(), getMetrics()])
      setDash(d.data)
      setMetrics(m.data)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <LoadingSpinner message="Loading dashboard…" />
  if (error)   return <ErrorMessage message={error} onRetry={load} />

  const s = dash?.summary || {}
  const charts = dash?.charts || {}

  const delayData = (charts.delay_by_test_type || []).map(d => ({
    name: d.test_type.length > 12 ? d.test_type.slice(0,10)+'…' : d.test_type,
    hours: d.avg_delay_hours,
    count: d.count,
  }))

  const riskData = (charts.risk_distribution || []).map(d => ({
    name: d.name,
    value: d.value,
    color: PIE_COLORS[d.name] || '#94a3b8',
  }))

  const blockerData = (charts.discharge_blocker_reasons || []).slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Hospital Operations Dashboard</h2>
          <p className="text-sm text-slate-500">
            Last updated: {lastRefresh.toLocaleTimeString()} •{' '}
            <span className="text-amber-600 font-medium">PROTOTYPE — Synthetic data only</span>
          </p>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm transition">
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* KPI cards — row 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard title="Total Patients"    value={s.total_patients}        icon={Users}        color="blue"   />
        <StatCard title="Active Admissions" value={s.active_admissions}     icon={Activity}     color="purple" />
        <StatCard title="Occupied Beds"     value={s.occupied_beds}         icon={Bed}          color="amber"  subtitle={`${s.bed_occupancy_pct}% occupancy`} />
        <StatCard title="Available Beds"    value={s.available_beds}        icon={Bed}          color="green"  />
        <StatCard title="Pending Tests"     value={s.pending_tests}         icon={FlaskConical} color="slate"  />
        <StatCard title="Active Alerts"     value={s.active_alerts}         icon={AlertTriangle} color="red"   />
      </div>

      {/* KPI cards — row 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard title="Delayed Diagnostics"  value={s.delayed_diagnostics}      icon={Clock}        color="amber"  />
        <StatCard title="High-Risk Patients"   value={s.high_risk_patients}       icon={ShieldAlert}  color="red"    />
        <StatCard title="Discharge Blockers"   value={s.discharge_blockers}       icon={AlertTriangle} color="red"   />
        <StatCard title="Avg Diagnostic Delay" value={`${s.avg_diagnostic_delay_hours}h`} icon={Clock} color="amber"  />
        <StatCard title="LOS Bottleneck Hours" value={`${s.los_bottleneck_hours}h`} icon={TrendingDown} color="red"
          subtitle="Hours lost to diagnostic delays" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Delay by test type */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Avg Diagnostic Delay by Test Type (hours)</h3>
          {delayData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={delayData} margin={{ top: 0, right: 10, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} unit="h" />
                <Tooltip formatter={(v) => [`${v}h`, 'Avg Delay']} />
                <Bar dataKey="hours" fill="#3b82f6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-400 text-center py-10">No delay data</p>}
        </div>

        {/* Risk distribution */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Active Patients by Risk Level</h3>
          {riskData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={riskData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {riskData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-400 text-center py-10">No risk data</p>}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Discharge blockers */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Discharge Blocker Reasons</h3>
          {blockerData.length > 0 ? (
            <div className="space-y-2">
              {blockerData.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="text-xs text-slate-600 w-40 truncate" title={item.reason}>{item.reason}</div>
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: `${Math.min(100, item.count * 20)}%` }} />
                  </div>
                  <span className="text-xs font-medium text-slate-600 w-6 text-right">{item.count}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-slate-400 text-center py-10">No active blockers</p>}
        </div>

        {/* Metrics summary */}
        {metrics && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">System Performance Metrics</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Avg LOS',          value: `${metrics.avg_los_hours}h` },
                { label: 'Median Delay',     value: `${metrics.median_diagnostic_delay_hours}h` },
                { label: 'LOS Baseline',     value: `${metrics.baseline_los_bottleneck_hours}h` },
                { label: 'LOS Proposed',     value: `${metrics.proposed_los_bottleneck_hours}h` },
                { label: 'Hours Saved',      value: `${metrics.hours_saved}h`, highlight: true },
                { label: 'Improvement',      value: `${metrics.improvement_pct}%`, highlight: true },
                { label: 'Precision',        value: `${(metrics.precision * 100).toFixed(0)}%` },
                { label: 'F1 Score',         value: `${metrics.f1_score?.toFixed(2)}` },
              ].map(m => (
                <div key={m.label} className={`rounded-lg p-2.5 ${m.highlight ? 'bg-green-50 border border-green-200' : 'bg-slate-50'}`}>
                  <p className="text-xs text-slate-500">{m.label}</p>
                  <p className={`text-base font-bold ${m.highlight ? 'text-green-700' : 'text-slate-800'}`}>{m.value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
              <Info size={11} />
              All metrics computed from SYNTHETIC data — not real clinical outcomes.
            </p>
          </div>
        )}
      </div>

      {/* Bed occupancy quick view */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Bed Occupancy Overview</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
            <div
              className="h-4 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-700"
              style={{ width: `${s.bed_occupancy_pct}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-slate-700 w-14 text-right">{s.bed_occupancy_pct}%</span>
        </div>
        <div className="flex items-center gap-6 mt-2 text-xs text-slate-500">
          <span><span className="font-medium text-blue-600">{s.occupied_beds}</span> occupied</span>
          <span><span className="font-medium text-green-600">{s.available_beds}</span> available</span>
          <span><span className="font-medium text-slate-700">{(s.occupied_beds||0) + (s.available_beds||0)}</span> total</span>
        </div>
      </div>
    </div>
  )
}
