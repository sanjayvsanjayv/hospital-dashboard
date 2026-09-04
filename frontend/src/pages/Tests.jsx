import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { FlaskConical, Search, ChevronRight, AlertTriangle } from 'lucide-react'
import { getTests, updateTestStatus } from '../api'
import { useAuth } from '../context/AuthContext'
import RiskBadge from '../components/RiskBadge'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import Modal from '../components/Modal'

const STATUS_TRANSITIONS = {
  pending:            ['specimen_collected', 'scan_started', 'completed'],
  specimen_collected: ['report_ready', 'completed'],
  scan_started:       ['report_ready', 'completed'],
  report_ready:       ['doctor_reviewed', 'completed'],
  doctor_reviewed:    ['completed'],
}

export default function Tests() {
  const { user } = useAuth()
  const role = user?.role
  const [tests, setTests]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [filters, setFilters]   = useState({ status: '', urgency: '', search: '' })
  const [updateModal, setUpdateModal] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = {}
      if (filters.status)  params.status  = filters.status
      if (filters.urgency) params.urgency = filters.urgency
      const res = await getTests(params)
      setTests(res.data.tests || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load tests.')
    } finally {
      setLoading(false)
    }
  }, [filters.status, filters.urgency])

  useEffect(() => { load() }, [load])

  const filtered = tests.filter(t =>
    !filters.search ||
    t.test_id?.toLowerCase().includes(filters.search.toLowerCase()) ||
    t.test_type?.toLowerCase().includes(filters.search.toLowerCase()) ||
    t.patient_id?.toLowerCase().includes(filters.search.toLowerCase())
  )

  async function handleUpdate(testId, newStatus) {
    setActionLoading(true)
    try {
      await updateTestStatus(testId, { status: newStatus })
      await load()
      setUpdateModal(null)
    } catch (err) {
      alert(err.response?.data?.error || 'Update failed.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">Diagnostic Tests</h2>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
            placeholder="Search test ID, type, patient…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        </div>
        <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="specimen_collected">Specimen Collected</option>
          <option value="report_ready">Report Ready</option>
          <option value="doctor_reviewed">Doctor Reviewed</option>
          <option value="completed">Completed</option>
        </select>
        <select value={filters.urgency} onChange={e => setFilters(p => ({ ...p, urgency: e.target.value }))}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          <option value="">All Urgency</option>
          <option value="urgent">Urgent</option>
          <option value="critical">Critical</option>
          <option value="routine">Routine</option>
        </select>
      </div>

      {loading ? <LoadingSpinner /> : error ? <ErrorMessage message={error} onRetry={load} /> : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Test ID','Patient','Test Type','Urgency','Stage','Delay','Risk','Status','Blocker','Action'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} className="py-10 text-center text-sm text-slate-400">No tests found.</td></tr>
                ) : filtered.map(t => (
                  <tr key={t._id || t.test_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-600">{t.test_id}</td>
                    <td className="px-4 py-3">
                      <Link to={`/patients/${t.patient_id}`} className="text-blue-600 hover:underline text-xs font-medium">{t.patient_id}</Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{t.test_type}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${t.urgency === 'urgent' || t.urgency === 'critical' ? 'text-red-600' : 'text-slate-500'}`}>
                        {t.urgency}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{t.stage || '—'}</td>
                    <td className="px-4 py-3">
                      {t.delay_hours > 0 ? (
                        <span className="text-xs font-semibold text-amber-700">{t.delay_hours}h</span>
                      ) : <span className="text-xs text-green-600">None</span>}
                    </td>
                    <td className="px-4 py-3"><RiskBadge level={t.risk_level || 'LOW'} /></td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-3">
                      {t.discharge_blocker ? (
                        <AlertTriangle size={14} className="text-red-500" title="Discharge Blocker" />
                      ) : <span className="text-xs text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {role !== 'specialist' && STATUS_TRANSITIONS[t.status] && (
                        <button onClick={() => setUpdateModal(t)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                          Update <ChevronRight size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Update Modal */}
      <Modal open={!!updateModal} onClose={() => setUpdateModal(null)}
        title={`Update: ${updateModal?.test_type}`}>
        {updateModal && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Current status: <StatusBadge status={updateModal.status} /></p>
            <p className="text-xs text-slate-500">Select new status:</p>
            <div className="flex flex-col gap-2">
              {(STATUS_TRANSITIONS[updateModal.status] || []).map(ns => (
                <button key={ns} onClick={() => handleUpdate(updateModal.test_id || updateModal._id, ns)}
                  disabled={actionLoading}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 capitalize">
                  {actionLoading ? 'Updating…' : ns.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
            <button onClick={() => setUpdateModal(null)}
              className="w-full py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold">Cancel</button>
          </div>
        )}
      </Modal>
    </div>
  )
}
