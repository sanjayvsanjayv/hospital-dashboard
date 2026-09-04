import { useEffect, useState, useCallback } from 'react'
import { Shield, Search, CheckCircle, XCircle, HelpCircle } from 'lucide-react'
import { getPatients, getConsent, updateConsent } from '../api'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import Modal from '../components/Modal'

function ConsentBadge({ status }) {
  const cfg = {
    given:      { icon: <CheckCircle size={14} className="text-green-500" />, text: 'text-green-700', bg: 'bg-green-50 border-green-200', label: 'Given' },
    not_given:  { icon: <XCircle size={14} className="text-red-500" />,   text: 'text-red-700',   bg: 'bg-red-50 border-red-200',   label: 'Not Given' },
    unknown:    { icon: <HelpCircle size={14} className="text-amber-500" />, text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', label: 'Unknown' },
  }
  const c = cfg[status] || cfg.unknown
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${c.bg} ${c.text}`}>
      {c.icon} {c.label}
    </span>
  )
}

export default function Consent() {
  const { user } = useAuth()
  const role = user?.role
  const [patients, setPatients] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')
  const [modal, setModal]       = useState(null) // patient
  const [form, setForm]         = useState({})
  const [consentRecord, setConsentRecord] = useState(null)
  const [saving, setSaving]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await getPatients({ per_page: 200 })
      setPatients(res.data.patients || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load patients.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function openConsentModal(pat) {
    setModal(pat)
    setConsentRecord(null)
    try {
      const res = await getConsent(pat.patient_id)
      setConsentRecord(res.data.consent)
      setForm({
        consent_status: res.data.consent?.consent_status || 'unknown',
        privacy_level: res.data.consent?.privacy_level || 'standard',
        data_sharing_consent: !!res.data.consent?.data_sharing_consent,
        research_consent: !!res.data.consent?.research_consent,
        notes: res.data.consent?.notes || '',
        consented_by: res.data.consent?.consented_by || '',
      })
    } catch {
      setForm({ consent_status: pat.consent_given || 'unknown', privacy_level: pat.privacy_level || 'standard', data_sharing_consent: false, research_consent: false, notes: '', consented_by: '' })
    }
  }

  async function saveConsent() {
    setSaving(true)
    try {
      await updateConsent(modal.patient_id, form)
      await load()
      setModal(null)
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save consent.')
    } finally {
      setSaving(false)
    }
  }

  const filtered = patients.filter(p =>
    !search ||
    p.patient_id?.toLowerCase().includes(search.toLowerCase()) ||
    p.ward?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Consent & Privacy Management</h2>
        <p className="text-sm text-slate-500">Manage patient consent and privacy settings. Synthetic data only — no real patient information.</p>
      </div>

      {/* Privacy info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Shield size={18} className="text-blue-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-800">Privacy & Role-Based Visibility</p>
          <ul className="text-xs text-blue-700 mt-1 space-y-1">
            <li>• <strong>Lab Staff</strong>: Can see Patient ID, test type, specimen/scan status only.</li>
            <li>• <strong>Nurse</strong>: Can see ward/bed, status, risk level. Cannot see specialist notes.</li>
            <li>• <strong>Doctor/Specialist</strong>: Full clinical information access.</li>
            <li>• <strong>Admin</strong>: Operational data access. Patient IDs are synthetic only.</li>
          </ul>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search patient ID or ward…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        </div>
      </div>

      {loading ? <LoadingSpinner /> : error ? <ErrorMessage message={error} onRetry={load} /> : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Patient ID','Ward','Status','Consent','Privacy Level','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">No patients found.</td></tr>
                ) : filtered.map(p => (
                  <tr key={p.patient_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-600">{p.patient_id}</td>
                    <td className="px-4 py-3 text-slate-600">{p.ward || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{p.status || '—'}</td>
                    <td className="px-4 py-3"><ConsentBadge status={p.consent_given || 'unknown'} /></td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        p.privacy_level === 'high' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {(p.privacy_level || 'standard').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {role !== 'lab' && (
                        <button onClick={() => openConsentModal(p)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium border border-blue-200 rounded-lg px-2.5 py-1 bg-blue-50">
                          View / Update
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

      {/* Consent Modal */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={`Consent — ${modal?.patient_id}`}>
        {modal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 bg-slate-50 rounded-lg p-3">
              <div><span className="font-medium">Patient ID:</span> {modal.patient_id}</div>
              <div><span className="font-medium">Ward:</span> {modal.ward || '—'}</div>
              <div><span className="font-medium">Status:</span> {modal.status}</div>
              <div><span className="font-medium">Age/Gender:</span> {modal.age}y / {modal.gender}</div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Consent Status</label>
              <select value={form.consent_status || 'unknown'} onChange={e => setForm(p => ({ ...p, consent_status: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                <option value="given">Given</option>
                <option value="not_given">Not Given</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Privacy Level</label>
              <select value={form.privacy_level || 'standard'} onChange={e => setForm(p => ({ ...p, privacy_level: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                <option value="standard">Standard</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!form.data_sharing_consent}
                  onChange={e => setForm(p => ({ ...p, data_sharing_consent: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                <span className="text-sm text-slate-600">Data Sharing Consent</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!form.research_consent}
                  onChange={e => setForm(p => ({ ...p, research_consent: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                <span className="text-sm text-slate-600">Research Consent</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Consented By</label>
              <input value={form.consented_by || ''} onChange={e => setForm(p => ({ ...p, consented_by: e.target.value }))}
                placeholder="Name of person who obtained consent"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
              <textarea value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Additional notes…"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 h-16 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>

            <p className="text-xs text-slate-400 bg-amber-50 border border-amber-200 rounded-lg p-2">
              ⚠ All patient IDs are synthetic. This prototype does not store or process real patient data.
            </p>

            <div className="flex gap-2">
              <button onClick={saveConsent} disabled={saving}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save Consent'}
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
