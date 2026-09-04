import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter, ChevronRight, AlertTriangle, Bed, User } from 'lucide-react'
import { getPatients } from '../api'
import RiskBadge from '../components/RiskBadge'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import EmptyState from '../components/EmptyState'

export default function Patients() {
  const [patients, setPatients] = useState([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [filters, setFilters]   = useState({ status: '', risk_level: '', ward: '', search: '' })
  const [page, setPage]         = useState(1)
  const PER_PAGE = 20

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = { page, per_page: PER_PAGE }
      if (filters.status)     params.status     = filters.status
      if (filters.risk_level) params.risk_level = filters.risk_level
      if (filters.ward)       params.ward       = filters.ward
      const res = await getPatients(params)
      setPatients(res.data.patients || [])
      setTotal(res.data.total || 0)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load patients.')
    } finally {
      setLoading(false)
    }
  }, [page, filters.status, filters.risk_level, filters.ward])

  useEffect(() => { load() }, [load])

  const filtered = patients.filter(p =>
    !filters.search ||
    p.patient_id?.toLowerCase().includes(filters.search.toLowerCase()) ||
    p.ward?.toLowerCase().includes(filters.search.toLowerCase()) ||
    p.doctor?.toLowerCase().includes(filters.search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Patient Management</h2>
          <p className="text-sm text-slate-500">{total} total records</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-40">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.search}
              onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
              placeholder="Search patient ID, ward, doctor…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <select value={filters.status} onChange={e => { setFilters(p => ({ ...p, status: e.target.value })); setPage(1) }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
            <option value="">All Statuses</option>
            <option value="admitted">Admitted</option>
            <option value="discharged">Discharged</option>
            <option value="transferred">Transferred</option>
          </select>
          <select value={filters.risk_level} onChange={e => { setFilters(p => ({ ...p, risk_level: e.target.value })); setPage(1) }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
            <option value="">All Risk Levels</option>
            <option value="HIGH">High Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="LOW">Low Risk</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? <LoadingSpinner /> : error ? <ErrorMessage message={error} onRetry={load} /> : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Patient ID','Age/Gender','Ward / Bed','Status','Risk Level','Discharge Blocked','Doctor',''].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="py-12"><EmptyState title="No patients found" message="Try adjusting your filters." icon={User} /></td></tr>
                ) : filtered.map(p => (
                  <tr key={p.patient_id || p._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-600">{p.patient_id}</td>
                    <td className="px-4 py-3 text-slate-600">{p.age ? `${p.age}y` : '—'} · {p.gender || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-slate-700">{p.ward || '—'}</span>
                      {p.bed_id && <span className="ml-1 text-xs text-slate-400">· {p.bed_id}</span>}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3">
                      <RiskBadge level={p.risk_level || 'LOW'} confidence={p.risk_confidence} />
                    </td>
                    <td className="px-4 py-3">
                      {p.is_discharge_blocked ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                          <AlertTriangle size={11} /> Blocked
                        </span>
                      ) : (
                        <span className="text-xs text-green-600">Clear</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{p.doctor || '—'}</td>
                    <td className="px-4 py-3">
                      <Link to={`/patients/${p.patient_id}`}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                        View <ChevronRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > PER_PAGE && (
            <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-between">
              <p className="text-xs text-slate-500">Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE, total)} of {total}</p>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Prev</button>
                <button disabled={page * PER_PAGE >= total} onClick={() => setPage(p => p + 1)}
                  className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
