import { useEffect, useState, useCallback } from 'react'
import { BarChart2, CheckCircle, XCircle, AlertTriangle, Info, RefreshCw } from 'lucide-react'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts'
import { getErrorAnalysis } from '../api'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

export default function ErrorAnalysis() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')
  const [tab, setTab]       = useState('summary')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await getErrorAnalysis()
      setData(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load error analysis.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <LoadingSpinner message="Computing error analysis…" />
  if (error)   return <ErrorMessage message={error} onRetry={load} />
  if (!data)   return null

  const metrics = [
    { name: 'Precision', value: data.precision },
    { name: 'Recall',    value: data.recall },
    { name: 'Accuracy',  value: data.accuracy },
    { name: 'F1 Score',  value: data.f1_score },
  ]

  const radarData = metrics.map(m => ({ subject: m.name, value: +(m.value * 100).toFixed(1) }))

  const confusionData = [
    { name: 'True Positive',  value: data.true_positives,  fill: '#22c55e' },
    { name: 'True Negative',  value: data.true_negatives,  fill: '#4ade80' },
    { name: 'False Positive', value: data.false_positives, fill: '#f59e0b' },
    { name: 'False Negative', value: data.false_negatives, fill: '#ef4444' },
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Error Analysis</h2>
          <p className="text-sm text-slate-500">Prediction quality metrics for the diagnostic delay engine.</p>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
        <Info size={14} className="text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800">{data.note}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {['summary','false_positives','false_negatives','data_issues'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition capitalize ${tab === t ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>
            {t.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {tab === 'summary' && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {metrics.map(m => (
              <div key={m.name} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{m.name}</p>
                <p className="text-3xl font-bold text-blue-700 mt-1">{(m.value * 100).toFixed(1)}%</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Radar chart */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Model Performance Radar</h3>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                  <Radar name="Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Confusion matrix bar chart */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Prediction Breakdown (HIGH risk classification)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={confusionData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0,4,4,0]}>
                    {confusionData.map((d, i) => (
                      <rect key={i} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Summary table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">Classification Summary</h3>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {[
                  { label: 'Total Assessed',        value: data.total_assessed,   icon: <BarChart2 size={14} className="text-blue-500" /> },
                  { label: 'True Positives',         value: data.true_positives,   icon: <CheckCircle size={14} className="text-green-500" /> },
                  { label: 'True Negatives',         value: data.true_negatives,   icon: <CheckCircle size={14} className="text-green-500" /> },
                  { label: 'False Positives',        value: data.false_positives,  icon: <XCircle size={14} className="text-amber-500" /> },
                  { label: 'False Negatives',        value: data.false_negatives,  icon: <XCircle size={14} className="text-red-500" /> },
                  { label: 'Missing Data Cases',     value: data.missing_data_cases?.length || 0,       icon: <AlertTriangle size={14} className="text-orange-500" /> },
                  { label: 'Conflicting Timestamps', value: data.conflicting_timestamp_cases?.length || 0, icon: <AlertTriangle size={14} className="text-orange-500" /> },
                ].map(r => (
                  <tr key={r.label} className="hover:bg-slate-50">
                    <td className="px-5 py-3 flex items-center gap-2 font-medium text-slate-700">{r.icon}{r.label}</td>
                    <td className="px-5 py-3 text-right font-bold text-slate-800">{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'false_positives' && (
        <DetailTable
          title="False Positive Details"
          items={data.false_positive_details || []}
          emptyMessage="No false positives detected."
          columns={['test_id', 'patient_id', 'predicted', 'actual', 'reason', 'marked_false_positive']}
        />
      )}

      {tab === 'false_negatives' && (
        <DetailTable
          title="False Negative Details (Missed High-Risk Cases)"
          items={data.false_negative_details || []}
          emptyMessage="No false negatives detected."
          columns={['test_id', 'patient_id', 'predicted', 'actual', 'reason']}
        />
      )}

      {tab === 'data_issues' && (
        <div className="space-y-4">
          <DetailTable
            title="Missing Timestamp Cases"
            items={data.missing_data_cases || []}
            emptyMessage="No missing data cases."
            columns={['test_id', 'patient_id', 'issue']}
          />
          <DetailTable
            title="Conflicting Timestamp Cases"
            items={data.conflicting_timestamp_cases || []}
            emptyMessage="No conflicting timestamp cases."
            columns={['test_id', 'patient_id', 'issue']}
          />
        </div>
      )}
    </div>
  )
}

function DetailTable({ title, items, emptyMessage, columns }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700">{title} ({items.length})</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400 p-5">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {columns.map(c => (
                  <th key={c} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {c.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  {columns.map(c => (
                    <td key={c} className="px-4 py-2.5 text-xs text-slate-600">
                      {typeof item[c] === 'boolean' ? (item[c] ? 'Yes' : 'No') : (item[c] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
