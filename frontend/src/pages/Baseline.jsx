import { useEffect, useState, useCallback } from 'react'
import { Info, TrendingDown, RefreshCw } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { getBaseline } from '../api'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

export default function Baseline() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await getBaseline()
      setData(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load baseline data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <LoadingSpinner message="Computing baseline comparison…" />
  if (error)   return <ErrorMessage message={error} onRetry={load} />
  if (!data)   return null

  const { baseline: bl, proposed: pr, comparison_table: ct, summary, disclaimer } = data

  // Chart data
  const chartData = (ct || []).filter(r => r.unit === 'hours').map(r => ({
    metric: r.metric.replace(' (hours)', '').replace('Total ', ''),
    Baseline: r.baseline,
    Proposed: r.proposed,
    improvement: `${r.improvement_pct}%`,
  }))

  const sideBySide = [
    { label: 'Process',                    baseline: bl.process_label,                       proposed: pr.process_label },
    { label: 'Detection Lag',              baseline: `${bl.detection_lag_hours}h`,            proposed: `${pr.detection_lag_hours}h` },
    { label: 'Total Tests Assessed',       baseline: bl.total_tests_assessed,                 proposed: pr.total_tests_assessed },
    { label: 'Tests with Delay',           baseline: bl.total_delayed_tests,                  proposed: pr.total_delayed_tests },
    { label: 'Avg Diagnostic Delay',       baseline: `${bl.avg_diagnostic_delay_hours}h`,     proposed: `${pr.avg_diagnostic_delay_hours}h` },
    { label: 'Median Diagnostic Delay',    baseline: `${bl.median_diagnostic_delay_hours}h`,  proposed: `${pr.median_diagnostic_delay_hours}h` },
    { label: 'Total LOS Bottleneck Hours', baseline: `${bl.total_los_bottleneck_hours}h`,     proposed: `${pr.total_los_bottleneck_hours}h` },
    { label: 'Avg LOS Bottleneck/Patient', baseline: `${bl.avg_los_bottleneck_hours_per_patient}h`, proposed: `${pr.avg_los_bottleneck_hours_per_patient}h` },
    { label: 'High-Risk Cases',            baseline: bl.high_risk_count,                      proposed: pr.high_risk_count },
    { label: 'Discharge Blockers',         baseline: bl.discharge_blockers,                   proposed: pr.discharge_blockers },
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Baseline vs Proposed Process</h2>
          <p className="text-sm text-slate-500">Synthetic experiment comparing manual vs automated diagnostic delay detection.</p>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <Info size={16} className="text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800">{disclaimer}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-xs text-red-600 font-semibold uppercase tracking-wide mb-1">Baseline LOS Bottleneck</p>
          <p className="text-3xl font-bold text-red-700">{bl.total_los_bottleneck_hours}h</p>
          <p className="text-xs text-red-500 mt-1">Manual/Reactive Process</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-1">Proposed LOS Bottleneck</p>
          <p className="text-3xl font-bold text-green-700">{pr.total_los_bottleneck_hours}h</p>
          <p className="text-xs text-green-500 mt-1">Early-Warning System</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">Hours Saved (Estimated)</p>
          <p className="text-3xl font-bold text-blue-700">{summary?.los_hours_saved}h</p>
          <p className="text-xs text-blue-500 mt-1">{summary?.improvement_pct}% reduction</p>
        </div>
      </div>

      {/* Bar chart */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Diagnostic Delay Metrics: Baseline vs Proposed</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ top: 0, right: 20, bottom: 30, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="metric" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" />
            <YAxis tick={{ fontSize: 11 }} unit="h" />
            <Tooltip formatter={(v) => [`${v}h`]} />
            <Legend />
            <Bar dataKey="Baseline" fill="#ef4444" radius={[4,4,0,0]} />
            <Bar dataKey="Proposed" fill="#22c55e" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Comparison table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Detailed Comparison</h3>
          <TrendingDown size={16} className="text-green-500" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Metric</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-red-600 uppercase tracking-wide">Baseline</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-green-600 uppercase tracking-wide">Proposed</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-blue-600 uppercase tracking-wide">Improvement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(ct || []).map((row, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-700">{row.metric}</td>
                  <td className="px-5 py-3 text-center font-mono text-red-700 bg-red-50/50">{row.baseline}{row.unit === 'hours' ? 'h' : ''}</td>
                  <td className="px-5 py-3 text-center font-mono text-green-700 bg-green-50/50">{row.proposed}{row.unit === 'hours' ? 'h' : ''}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`font-semibold ${row.improvement_pct > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                      {row.improvement_pct > 0 ? `↓ ${row.improvement_pct}%` : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side-by-side detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Baseline */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-red-700 mb-3">Baseline Process</h3>
          <ul className="space-y-2 text-xs text-red-800">
            <li>• Diagnostic bottlenecks identified only after substantial delay or manual observation.</li>
            <li>• No automated alerts — delays accumulate before anyone notices.</li>
            <li>• Escalation depends on individual initiative, not structured workflow.</li>
            <li>• LOS bottleneck hours are untracked and unreported in real time.</li>
            <li>• Average detection lag: <strong>{bl.detection_lag_hours} hours</strong>.</li>
          </ul>
        </div>
        {/* Proposed */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-green-700 mb-3">Proposed Process (This System)</h3>
          <ul className="space-y-2 text-xs text-green-800">
            <li>• Rule-based engine detects bottlenecks automatically at each pipeline stage.</li>
            <li>• Alerts generated before delays become critical (within ~{pr.detection_lag_hours}h).</li>
            <li>• Structured escalation workflow from nurse → doctor → specialist → admin.</li>
            <li>• Real-time LOS bottleneck metric visible to all staff.</li>
            <li>• Average detection lag: <strong>{pr.detection_lag_hours} hours</strong>.</li>
          </ul>
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center">
        ⚠ All values computed from SYNTHETIC data. Improvement figures are illustrative estimates, not proven clinical outcomes.
      </p>
    </div>
  )
}
