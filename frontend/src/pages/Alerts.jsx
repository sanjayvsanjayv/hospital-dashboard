import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell, CheckCircle, ArrowUpCircle, XCircle, AlertTriangle, RefreshCw,
  MessageSquare, User, Clock, ChevronDown, ChevronUp
} from 'lucide-react'
import {
  getAlerts, acknowledgeAlert, escalateAlert, resolveAlert,
  markFalsePositive, getEscalations, resolveEscalation
} from '../api'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import Modal from '../components/Modal'

function fmt(ts) {
  if (!ts) return '—'
  try { return new Date(ts).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) }
  catch { return ts }
}

const SEVERITY_STYLES = {
  high:   'border-l-4 border-l-red-400 bg-red-50',
  medium: 'border-l-4 border-l-amber-400 bg-amber-50',
  low:    'border-l-4 border-l-green-400 bg-green-50',
}

const TYPE_ICONS = {
  HIGH_RISK:                  '🔴',
  MEDIUM_RISK:                '🟠',
  LOW_RISK:                   '🟢',
  DISCHARGE_BLOCKER:          '⛔',
  SPECIALIST_UNAVAILABLE:     '👨‍⚕️',
  SPECIMEN_COLLECTION_DELAY:  '🧪',
  SCAN_DELAY:                 '🔬',
  REPORT_PENDING:             '📋',
  DOCTOR_REVIEW_PENDING:      '👁',
}

export default function Alerts() {
  const { user } = useAuth()
  const role = user?.role

  const [alerts, setAlerts]   = useState([])
  const [escs, setEscs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [filter, setFilter]   = useState({ status: 'active', severity: '' })
  const [expanded, setExpanded] = useState(null)
  const [modal, setModal]     = useState(null) // { type, alert }
  const [note, setNote]       = useState('')
  const [reason, setReason]   = useState('')
  const [toRole, setToRole]   = useState('doctor')
  const [actionLoading, setActionLoading] = useState(false)
  const [tab, setTab]         = useState('alerts')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = {}
      if (filter.status)   params.status   = filter.status
      if (filter.severity) params.severity = filter.severity
      const [ar, er] = await Promise.all([getAlerts(params), getEscalations()])
      setAlerts(ar.data.alerts || [])
      setEscs(er.data.escalations || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load alerts.')
    } finally {
      setLoading(false)
    }
  }, [filter.status, filter.severity])

  useEffect(() => { load() }, [load])

  async function doAction(type, alertId, extra = {}) {
    setActionLoading(true)
    try {
      if (type === 'acknowledge') await acknowledgeAlert(alertId, { note })
      if (type === 'escalate')   await escalateAlert(alertId, { reason, to_role: toRole })
      if (type === 'resolve')    await resolveAlert(alertId, { note })
      if (type === 'fp')         await markFalsePositive(alertId, { reason })
      if (type === 'resolve_esc') await resolveEscalation(alertId, { comment: note })
      await load()
      setModal(null); setNote(''); setReason('')
    } catch (err) {
      alert(err.response?.data?.error || 'Action failed.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">Alerts & Escalations</h2>
        <button onClick={load} className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {[
          { key: 'alerts', label: `Alerts (${alerts.length})` },
          { key: 'escalations', label: `Escalations (${escs.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition ${tab === t.key ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'alerts' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3">
            <select value={filter.status} onChange={e => setFilter(p => ({ ...p, status: e.target.value }))}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="escalated">Escalated</option>
              <option value="resolved">Resolved</option>
              <option value="false_positive">False Positive</option>
            </select>
            <select value={filter.severity} onChange={e => setFilter(p => ({ ...p, severity: e.target.value }))}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
              <option value="">All Severity</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {loading ? <LoadingSpinner /> : error ? <ErrorMessage message={error} onRetry={load} /> : (
            <div className="space-y-2">
              {alerts.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                  <Bell size={32} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No alerts found.</p>
                </div>
              ) : alerts.map(a => (
                <div key={a._id || a.alert_id}
                  className={`rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden ${SEVERITY_STYLES[a.severity] || ''}`}>
                  <div className="p-4 cursor-pointer"
                    onClick={() => setExpanded(prev => prev === a._id ? null : a._id)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="text-xl mt-0.5">{TYPE_ICONS[a.alert_type] || '⚠️'}</span>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{a.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{a.message}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <StatusBadge status={a.status} />
                            {a.patient_id && (
                              <Link to={`/patients/${a.patient_id}`} onClick={e => e.stopPropagation()}
                                className="text-xs text-blue-600 hover:underline font-medium">
                                {a.patient_id}
                              </Link>
                            )}
                            <span className="text-xs text-slate-400"><Clock size={10} className="inline mr-1" />{fmt(a.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {a.status === 'active' && (
                          <button onClick={e => { e.stopPropagation(); setModal({ type: 'acknowledge', alert: a }) }}
                            className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-2.5 py-1.5 bg-blue-50 font-medium flex items-center gap-1">
                            <CheckCircle size={12} /> Ack
                          </button>
                        )}
                        {['active','acknowledged'].includes(a.status) && !a.escalated && (
                          <button onClick={e => { e.stopPropagation(); setModal({ type: 'escalate', alert: a }) }}
                            className="text-xs text-orange-600 hover:text-orange-800 border border-orange-200 rounded-lg px-2.5 py-1.5 bg-orange-50 font-medium flex items-center gap-1">
                            <ArrowUpCircle size={12} /> Escalate
                          </button>
                        )}
                        {!['resolved','false_positive'].includes(a.status) && (
                          <button onClick={e => { e.stopPropagation(); setModal({ type: 'resolve', alert: a }) }}
                            className="text-xs text-green-600 hover:text-green-800 border border-green-200 rounded-lg px-2.5 py-1.5 bg-green-50 font-medium flex items-center gap-1">
                            <CheckCircle size={12} /> Resolve
                          </button>
                        )}
                        {a.status === 'active' && (
                          <button onClick={e => { e.stopPropagation(); setModal({ type: 'fp', alert: a }) }}
                            className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium flex items-center gap-1">
                            <XCircle size={12} /> FP
                          </button>
                        )}
                        {expanded === a._id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                      </div>
                    </div>
                  </div>

                  {expanded === a._id && (
                    <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                      {/* Notes */}
                      {a.notes?.length > 0 && (
                        <div className="space-y-1.5 mb-3">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Activity Log</p>
                          {a.notes.map((n, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg p-2">
                              <MessageSquare size={12} className="mt-0.5 text-slate-400 shrink-0" />
                              <div>
                                <span className="font-medium">{n.by}</span>: {n.text}
                                <span className="text-slate-400 ml-2">{fmt(n.at)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {a.acknowledged_by && (
                        <p className="text-xs text-slate-500">Acknowledged by: <strong>{a.acknowledged_by}</strong> at {fmt(a.acknowledged_at)}</p>
                      )}
                      {a.is_false_positive && (
                        <p className="text-xs text-slate-500 mt-1">⚠ Marked as False Positive</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'escalations' && (
        <div className="space-y-2">
          {escs.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
              <ArrowUpCircle size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No escalations found.</p>
            </div>
          ) : escs.map(e => (
            <div key={e._id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Escalation {e.escalation_id}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {e.from_role} → {e.to_role} · {fmt(e.timestamp)}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">Reason: {e.reason}</p>
                  {e.patient_id && (
                    <Link to={`/patients/${e.patient_id}`}
                      className="text-xs text-blue-600 hover:underline font-medium mt-1 block">
                      Patient: {e.patient_id}
                    </Link>
                  )}
                  <div className="mt-1.5"><StatusBadge status={e.status} /></div>
                </div>
                {e.status !== 'resolved' && (
                  <button onClick={() => setModal({ type: 'resolve_esc', alert: e })}
                    className="text-xs text-green-600 hover:text-green-800 border border-green-200 rounded-lg px-3 py-1.5 bg-green-50 font-medium">
                    Resolve
                  </button>
                )}
              </div>
              {e.comments?.length > 0 && (
                <div className="mt-2 space-y-1">
                  {e.comments.map((c, i) => (
                    <p key={i} className="text-xs text-slate-500 bg-slate-50 rounded p-1.5">{c.by}: {c.text}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action Modals */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={
        modal?.type === 'acknowledge' ? 'Acknowledge Alert' :
        modal?.type === 'escalate'   ? 'Escalate Alert' :
        modal?.type === 'resolve' || modal?.type === 'resolve_esc' ? 'Resolve' :
        modal?.type === 'fp'         ? 'Mark as False Positive' : 'Action'
      }>
        {modal && (
          <div className="space-y-4">
            {modal.type !== 'resolve_esc' && (
              <p className="text-sm text-slate-600 font-medium">{modal.alert?.title}</p>
            )}

            {modal.type === 'escalate' && (
              <>
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
                  <label className="block text-xs font-medium text-slate-600 mb-1">Reason *</label>
                  <textarea value={reason} onChange={e => setReason(e.target.value)}
                    placeholder="Reason for escalation…"
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
              </>
            )}

            {modal.type === 'fp' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Reason *</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="Why is this a false positive?"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              </div>
            )}

            {(modal.type === 'acknowledge' || modal.type === 'resolve' || modal.type === 'resolve_esc') && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Note (optional)</label>
                <textarea value={note} onChange={e => setNote(e.target.value)}
                  placeholder="Add a note…"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => doAction(modal.type, modal.alert.alert_id || modal.alert.escalation_id || modal.alert._id)}
                disabled={actionLoading || (modal.type === 'escalate' && !reason.trim()) || (modal.type === 'fp' && !reason.trim())}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                {actionLoading ? 'Processing…' : 'Confirm'}
              </button>
              <button onClick={() => setModal(null)}
                className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200">
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
