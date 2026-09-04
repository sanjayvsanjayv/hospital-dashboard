import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, User, Bed, Clock, AlertTriangle, CheckCircle,
  FlaskConical, ChevronDown, ChevronUp, RefreshCw, Info,
  ArrowUpCircle
} from 'lucide-react'
import { getPatient, updateTestStatus, escalateAlert, getAlerts } from '../api'
import { useAuth } from '../context/AuthContext'
import RiskBadge from '../components/RiskBadge'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import Modal from '../components/Modal'

function fmt(ts) {
  if (!ts) return '—'
  try { return new Date(ts).toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) }
  catch { return ts }
}

function TimelineItem({ event, isLast }) {
  const STATUS_ICON = {
    completed: <CheckCircle size={16} className="text-green-500" />,
    delayed:   <AlertTriangle size={16} className="text-red-500" />,
    pending:   <Clock size={16} className="text-amber-500" />,
    blocked:   <AlertTriangle size={16} className="text-red-600" />,
  }
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center shadow-sm">
          {STATUS_ICON[event.status] || <Clock size={14} className="text-slate-400" />}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-slate-200 my-1 min-h-4" />}
      </div>
      <div className="flex-1 pb-4">
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800">{event.stage}</p>
            <StatusBadge status={event.status} />
          </div>
          <p className="text-xs text-slate-500 mt-1">{event.description}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
            {event.timestamp && <span><Clock size={11} className="inline mr-1" />{fmt(event.timestamp)}</span>}
            {event.department && <span>· {event.department}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PatientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const role = user?.role

  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [expandedTest, setExpanded] = useState(null)
  const [updateModal, setUpdateModal] = useState(null)
  const [escalateModal, setEscalateModal] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [alerts, setAlerts]       = useState([])

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [res, alertRes] = await Promise.all([
        getPatient(id),
        getAlerts({ patient_id: id }),
      ])
      setData(res.data)
      setAlerts(alertRes.data.alerts || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load patient.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleUpdateTest(testId, newStatus) {
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

  async function handleEscalate(alertId, reason, toRole) {
    setActionLoading(true)
    try {
      await escalateAlert(alertId, { reason, to_role: toRole })
      await load()
      setEscalateModal(null)
    } catch (err) {
      alert(err.response?.data?.error || 'Escalation failed.')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <LoadingSpinner message="Loading patient details…" />
  if (error)   return <ErrorMessage message={error} onRetry={load} />
  if (!data)   return null

  const { patient: pat, tests = [], timeline = [], risk_summary } = data

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/patients')}
          className="text-slate-500 hover:text-slate-800 flex items-center gap-1.5 text-sm">
          <ArrowLeft size={16} /> Patients
        </button>
        <ChevronDown size={14} className="text-slate-400 rotate-[-90deg]" />
        <span className="text-sm font-semibold text-slate-800">{pat.patient_id}</span>
        <div className="ml-auto flex items-center gap-2">
          <RiskBadge level={pat.risk_level || risk_summary?.risk_level || 'LOW'}
            confidence={pat.risk_confidence || risk_summary?.confidence} size="lg" />
          <button onClick={load} className="text-slate-400 hover:text-blue-600 transition">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Patient info card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <User size={24} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{pat.patient_id}</h2>
              <p className="text-sm text-slate-500">{pat.age ? `${pat.age} yrs` : '—'} · {pat.gender || '—'} · {pat.specialty || '—'}</p>
            </div>
          </div>
          <StatusBadge status={pat.status} className="text-sm" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          {[
            { label: 'Ward',       value: pat.ward || '—' },
            { label: 'Bed',        value: pat.bed_id || '—' },
            { label: 'Admitted',   value: fmt(pat.admission_time) },
            { label: 'Diagnosis',  value: pat.diagnosis || '—' },
            { label: 'Doctor',     value: pat.doctor || '—' },
            { label: 'Specialist', value: pat.specialist || '—' },
            { label: 'Consent',    value: (pat.consent_given || 'unknown').replace(/_/g,' ').toUpperCase() },
            { label: 'Privacy',    value: (pat.privacy_level || 'standard').toUpperCase() },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
              <p className="font-medium text-slate-700 mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {/* Risk summary */}
        {risk_summary && (
          <div className={`mt-4 rounded-lg p-3 border ${
            risk_summary.risk_level === 'HIGH' ? 'bg-red-50 border-red-200' :
            risk_summary.risk_level === 'MEDIUM' ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <Info size={14} className="text-slate-500" />
              <span className="text-xs font-semibold text-slate-700">Risk Assessment (Model Confidence: {risk_summary.confidence}%)</span>
            </div>
            <p className="text-xs text-slate-600">{risk_summary.explanation}</p>
            <p className="text-xs text-slate-400 mt-1">⚠ PROTOTYPE confidence — not clinically validated.</p>
          </div>
        )}

        {/* Discharge blocked */}
        {pat.is_discharge_blocked && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700">Discharge Blocked</p>
              <p className="text-xs text-red-600">{pat.discharge_blocker_reason || 'Pending diagnostic result.'}</p>
              {pat.estimated_additional_los_hours > 0 && (
                <p className="text-xs text-red-500 mt-1">Estimated additional LOS: <strong>{pat.estimated_additional_los_hours}h</strong></p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Diagnostic Tests */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Diagnostic Tests ({tests.length})</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {tests.length === 0 ? (
            <p className="text-sm text-slate-400 p-5">No tests ordered.</p>
          ) : tests.map(t => (
            <div key={t._id || t.test_id} className="p-4">
              <div className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpanded(prev => prev === t._id ? null : t._id)}>
                <div className="flex items-center gap-3">
                  <FlaskConical size={18} className="text-blue-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{t.test_type}</p>
                    <p className="text-xs text-slate-400">Urgency: <span className={t.urgency === 'urgent' || t.urgency === 'critical' ? 'text-red-600 font-semibold' : ''}>{t.urgency}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <RiskBadge level={t.risk_level || 'LOW'} confidence={t.confidence} />
                  {t.delay_hours > 0 && (
                    <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                      {t.delay_hours}h delay
                    </span>
                  )}
                  {t.discharge_blocker && (
                    <span className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                      Discharge Blocker
                    </span>
                  )}
                  {expandedTest === t._id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </div>
              </div>

              {expandedTest === t._id && (
                <div className="mt-4 space-y-3">
                  {/* Data issues */}
                  {t.data_issues?.length > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      {t.data_issues.map((issue, i) => (
                        <p key={i} className="text-xs text-orange-700 flex items-center gap-1">
                          <AlertTriangle size={11} /> {issue}
                        </p>
                      ))}
                    </div>
                  )}
                  
                  {/* Timestamps grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    {[
                      { label: 'Test Ordered',      value: fmt(t.test_order_time) },
                      { label: 'Specimen Collected', value: fmt(t.specimen_time) },
                      { label: 'Scan Started',       value: fmt(t.scan_start_time) },
                      { label: 'Report Generated',   value: fmt(t.report_time) },
                      { label: 'Doctor Reviewed',    value: fmt(t.doctor_review_time) },
                      { label: 'Current Stage',      value: t.stage || '—' },
                      { label: 'Delay Type',         value: t.delay_type || '—' },
                      { label: 'Delay Hours',        value: t.delay_hours > 0 ? `${t.delay_hours}h` : 'None' },
                      { label: 'Specialist Req.',    value: t.specialist_required ? 'Yes' : 'No' },
                      { label: 'Specialist Avail.',  value: t.specialist_available ? 'Yes' : 'No' },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-slate-50 rounded-lg p-2">
                        <p className="text-slate-400 uppercase tracking-wide text-[10px]">{label}</p>
                        <p className="font-medium text-slate-700 mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>

                  {t.explanation && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs text-blue-700">{t.explanation}</p>
                    </div>
                  )}

                  {/* Action buttons for nurse/lab/doctor */}
                  {role !== 'specialist' && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {!t.specimen_time && !t.scan_start_time && (
                        <button onClick={() => setUpdateModal({ test: t, nextStatus: 'specimen_collected' })}
                          className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                          Mark Specimen Collected
                        </button>
                      )}
                      {(t.specimen_time || t.scan_start_time) && !t.report_time && (
                        <button onClick={() => setUpdateModal({ test: t, nextStatus: 'report_ready' })}
                          className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700">
                          Mark Report Ready
                        </button>
                      )}
                      {t.report_time && !t.doctor_review_time && role === 'doctor' && (
                        <button onClick={() => setUpdateModal({ test: t, nextStatus: 'doctor_reviewed' })}
                          className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                          Mark Doctor Reviewed
                        </button>
                      )}
                      {t.status !== 'completed' && (
                        <button onClick={() => setUpdateModal({ test: t, nextStatus: 'completed' })}
                          className="text-xs px-3 py-1.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700">
                          Mark Completed
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.filter(a => a.status !== 'resolved').length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Active Alerts</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {alerts.filter(a => a.status !== 'resolved').map(a => (
              <div key={a._id} className="p-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={16} className={a.severity === 'high' ? 'text-red-500 mt-0.5' : 'text-amber-500 mt-0.5'} />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{a.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{a.message}</p>
                    <StatusBadge status={a.status} className="mt-1" />
                  </div>
                </div>
                {(role === 'nurse' || role === 'doctor') && !a.escalated && (
                  <button onClick={() => setEscalateModal(a)}
                    className="flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-800 border border-orange-200 rounded-lg px-2.5 py-1.5 bg-orange-50 font-medium shrink-0">
                    <ArrowUpCircle size={13} /> Escalate
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Patient Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-5">Patient Journey Timeline</h3>
        {timeline.length === 0 ? (
          <p className="text-sm text-slate-400">No timeline data available.</p>
        ) : (
          <div>
            {timeline.map((event, i) => (
              <TimelineItem key={i} event={event} isLast={i === timeline.length - 1} />
            ))}
          </div>
        )}
      </div>

      {/* Update Test Modal */}
      <Modal open={!!updateModal} onClose={() => setUpdateModal(null)}
        title={`Update Test: ${updateModal?.test?.test_type}`}>
        {updateModal && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Mark this test as <strong>{updateModal.nextStatus.replace(/_/g, ' ')}</strong>?
            </p>
            <p className="text-xs text-slate-400">
              The system will auto-set the timestamp to now and recalculate patient risk.
            </p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => handleUpdateTest(updateModal.test.test_id || updateModal.test._id, updateModal.nextStatus)}
                disabled={actionLoading}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                {actionLoading ? 'Updating…' : 'Confirm Update'}
              </button>
              <button onClick={() => setUpdateModal(null)}
                className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200">
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Escalate Modal */}
      <Modal open={!!escalateModal} onClose={() => setEscalateModal(null)} title="Escalate Alert">
        {escalateModal && (
          <EscalateForm alert={escalateModal} role={role}
            onConfirm={handleEscalate} onClose={() => setEscalateModal(null)} loading={actionLoading} />
        )}
      </Modal>
    </div>
  )
}

function EscalateForm({ alert, role, onConfirm, onClose, loading }) {
  const [reason, setReason] = useState('')
  const [toRole, setToRole] = useState('doctor')
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Alert: <strong>{alert.title}</strong></p>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Escalate To</label>
        <select value={toRole} onChange={e => setToRole(e.target.value)}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          <option value="doctor">Doctor</option>
          <option value="specialist">Specialist</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Reason</label>
        <textarea value={reason} onChange={e => setReason(e.target.value)}
          placeholder="Describe the reason for escalation…"
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
      </div>
      <div className="flex gap-2">
        <button onClick={() => onConfirm(alert.alert_id || alert._id, reason, toRole)}
          disabled={loading || !reason.trim()}
          className="flex-1 py-2 bg-orange-600 text-white rounded-lg text-sm font-semibold hover:bg-orange-700 disabled:opacity-50">
          {loading ? 'Escalating…' : 'Escalate'}
        </button>
        <button onClick={onClose}
          className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200">
          Cancel
        </button>
      </div>
    </div>
  )
}
