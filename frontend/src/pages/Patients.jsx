import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  ChevronRight,
  AlertTriangle,
  User,
  Plus,
  X
} from 'lucide-react'

import {
  getPatients,
  createPatient
} from '../api'

import RiskBadge from '../components/RiskBadge'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import EmptyState from '../components/EmptyState'

export default function Patients() {

  // ─────────────────────────────────────────────
  // Patient list states
  // ─────────────────────────────────────────────
  const [patients, setPatients] = useState([])
  const [total, setTotal] = useState(0)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [filters, setFilters] = useState({
    status: '',
    risk_level: '',
    ward: '',
    search: ''
  })

  const [page, setPage] = useState(1)

  const PER_PAGE = 20

  // ─────────────────────────────────────────────
  // Add Patient modal
  // ─────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')

  const [form, setForm] = useState({
    patient_id: '',
    age: '',
    gender: '',
    ward: '',
    bed_id: '',
    doctor: '',
    status: 'admitted'
  })

  // ─────────────────────────────────────────────
  // Load patients
  // ─────────────────────────────────────────────
  const load = useCallback(async () => {

    setLoading(true)
    setError('')

    try {

      const params = {
        page,
        per_page: PER_PAGE
      }

      if (filters.status) {
        params.status = filters.status
      }

      if (filters.risk_level) {
        params.risk_level = filters.risk_level
      }

      if (filters.ward) {
        params.ward = filters.ward
      }

      const res = await getPatients(params)

      setPatients(res.data.patients || [])
      setTotal(res.data.total || 0)

    } catch (err) {

      setError(
        err.response?.data?.error ||
        'Failed to load patients.'
      )

    } finally {

      setLoading(false)

    }

  }, [
    page,
    filters.status,
    filters.risk_level,
    filters.ward
  ])

  useEffect(() => {
    load()
  }, [load])

  // ─────────────────────────────────────────────
  // Search filtering
  // ─────────────────────────────────────────────
  const filtered = patients.filter(p => {

    const search = filters.search.toLowerCase()

    if (!search) return true

    return (
      p.patient_id?.toLowerCase().includes(search) ||
      p.ward?.toLowerCase().includes(search) ||
      p.doctor?.toLowerCase().includes(search)
    )

  })

  // ─────────────────────────────────────────────
  // Form change
  // ─────────────────────────────────────────────
  function handleFormChange(e) {

    const { name, value } = e.target

    setForm(prev => ({
      ...prev,
      [name]: value
    }))

  }

  // ─────────────────────────────────────────────
  // Open Add Patient
  // ─────────────────────────────────────────────
  function openAddModal() {

    setForm({
      patient_id: '',
      age: '',
      gender: '',
      ward: '',
      bed_id: '',
      doctor: '',
      status: 'admitted'
    })

    setAddError('')
    setShowAddModal(true)

  }

  // ─────────────────────────────────────────────
  // Close Add Patient
  // ─────────────────────────────────────────────
  function closeAddModal() {

    if (addLoading) return

    setShowAddModal(false)
    setAddError('')

  }

  // ─────────────────────────────────────────────
  // Add Patient
  // ─────────────────────────────────────────────
  async function handleAddPatient(e) {

    e.preventDefault()

    setAddError('')

    // Basic validation
    if (!form.patient_id.trim()) {
      setAddError('Patient ID is required.')
      return
    }

    if (!form.age) {
      setAddError('Age is required.')
      return
    }

    if (!form.gender) {
      setAddError('Gender is required.')
      return
    }

    if (!form.ward.trim()) {
      setAddError('Ward is required.')
      return
    }

    setAddLoading(true)

    try {

      const patientData = {
        patient_id: form.patient_id.trim(),
        age: Number(form.age),
        gender: form.gender,
        ward: form.ward.trim(),
        bed_id: form.bed_id.trim(),
        doctor: form.doctor.trim(),
        status: form.status
      }

      await createPatient(patientData)

      alert('Patient added successfully!')

      setShowAddModal(false)

      // Refresh patient list
      await load()

    } catch (err) {

      setAddError(
        err.response?.data?.error ||
        'Failed to add patient.'
      )

    } finally {

      setAddLoading(false)

    }

  }

  return (

    <div className="space-y-4">

      {/* ─────────────────────────────────────────
          Header
      ───────────────────────────────────────── */}
      <div className="flex items-center justify-between">

        <div>

          <h2 className="text-xl font-bold text-slate-800">
            Patient Management
          </h2>

          <p className="text-sm text-slate-500">
            {total} total records
          </p>

        </div>

        {/* ADD PATIENT BUTTON */}
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition"
        >
          <Plus size={17} />
          Add Patient
        </button>

      </div>


      {/* ─────────────────────────────────────────
          Filters
      ───────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">

        <div className="flex flex-wrap gap-3">

          {/* Search */}
          <div className="relative flex-1 min-w-40">

            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={filters.search}
              onChange={e =>
                setFilters(p => ({
                  ...p,
                  search: e.target.value
                }))
              }
              placeholder="Search patient ID, ward, doctor…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />

          </div>


          {/* Status */}
          <select
            value={filters.status}
            onChange={e => {

              setFilters(p => ({
                ...p,
                status: e.target.value
              }))

              setPage(1)

            }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >

            <option value="">
              All Statuses
            </option>

            <option value="admitted">
              Admitted
            </option>

            <option value="discharged">
              Discharged
            </option>

            <option value="transferred">
              Transferred
            </option>

          </select>


          {/* Risk */}
          <select
            value={filters.risk_level}
            onChange={e => {

              setFilters(p => ({
                ...p,
                risk_level: e.target.value
              }))

              setPage(1)

            }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >

            <option value="">
              All Risk Levels
            </option>

            <option value="HIGH">
              High Risk
            </option>

            <option value="MEDIUM">
              Medium Risk
            </option>

            <option value="LOW">
              Low Risk
            </option>

          </select>

        </div>

      </div>


      {/* ─────────────────────────────────────────
          Patient Table
      ───────────────────────────────────────── */}
      {loading ? (

        <LoadingSpinner />

      ) : error ? (

        <ErrorMessage
          message={error}
          onRetry={load}
        />

      ) : (

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead>

                <tr className="bg-slate-50 border-b border-slate-200">

                  {[
                    'Patient ID',
                    'Age/Gender',
                    'Ward / Bed',
                    'Status',
                    'Risk Level',
                    'Discharge Blocked',
                    'Doctor',
                    ''
                  ].map(h => (

                    <th
                      key={h}
                      className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap"
                    >
                      {h}
                    </th>

                  ))}

                </tr>

              </thead>


              <tbody className="divide-y divide-slate-100">

                {filtered.length === 0 ? (

                  <tr>

                    <td
                      colSpan={8}
                      className="py-12"
                    >

                      <EmptyState
                        title="No patients found"
                        message="Try adjusting your filters."
                        icon={User}
                      />

                    </td>

                  </tr>

                ) : (

                  filtered.map(p => (

                    <tr
                      key={p.patient_id || p._id}
                      className="hover:bg-slate-50 transition-colors"
                    >

                      {/* Patient ID */}
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-600">
                        {p.patient_id}
                      </td>


                      {/* Age / Gender */}
                      <td className="px-4 py-3 text-slate-600">

                        {p.age
                          ? `${p.age}y`
                          : '—'
                        }

                        {' · '}

                        {p.gender || '—'}

                      </td>


                      {/* Ward / Bed */}
                      <td className="px-4 py-3">

                        <span className="text-slate-700">
                          {p.ward || '—'}
                        </span>

                        {p.bed_id && (

                          <span className="ml-1 text-xs text-slate-400">
                            · {p.bed_id}
                          </span>

                        )}

                      </td>


                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>


                      {/* Risk */}
                      <td className="px-4 py-3">

                        <RiskBadge
                          level={p.risk_level || 'LOW'}
                          confidence={p.risk_confidence}
                        />

                      </td>


                      {/* Discharge */}
                      <td className="px-4 py-3">

                        {p.is_discharge_blocked ? (

                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">

                            <AlertTriangle size={11} />

                            Blocked

                          </span>

                        ) : (

                          <span className="text-xs text-green-600">
                            Clear
                          </span>

                        )}

                      </td>


                      {/* Doctor */}
                      <td className="px-4 py-3 text-slate-500 text-xs">

                        {p.doctor || '—'}

                      </td>


                      {/* View */}
                      <td className="px-4 py-3">

                        <Link
                          to={`/patients/${p.patient_id}`}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >

                          View

                          <ChevronRight size={13} />

                        </Link>

                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

          </div>


          {/* ─────────────────────────────────────
              Pagination
          ───────────────────────────────────── */}
          {total > PER_PAGE && (

            <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-between">

              <p className="text-xs text-slate-500">

                Showing{' '}

                {(page - 1) * PER_PAGE + 1}

                –

                {Math.min(page * PER_PAGE, total)}

                {' '}of{' '}

                {total}

              </p>


              <div className="flex gap-2">

                <button
                  disabled={page === 1}
                  onClick={() =>
                    setPage(p => p - 1)
                  }
                  className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
                >
                  Prev
                </button>


                <button
                  disabled={page * PER_PAGE >= total}
                  onClick={() =>
                    setPage(p => p + 1)
                  }
                  className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
                >
                  Next
                </button>

              </div>

            </div>

          )}

        </div>

      )}


      {/* ═══════════════════════════════════════════
          ADD PATIENT MODAL
      ═══════════════════════════════════════════ */}
      {showAddModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">

              <div>

                <h3 className="text-lg font-bold text-slate-800">
                  Add New Patient
                </h3>

                <p className="text-xs text-slate-500 mt-1">
                  Enter patient details below
                </p>

              </div>


              <button
                onClick={closeAddModal}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
              >

                <X size={20} />

              </button>

            </div>


            {/* Form */}
            <form
              onSubmit={handleAddPatient}
              className="p-6 space-y-4"
            >

              {/* Error */}
              {addError && (

                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {addError}
                </div>

              )}


              {/* Patient ID */}
              <div>

                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Patient ID *
                </label>

                <input
                  name="patient_id"
                  value={form.patient_id}
                  onChange={handleFormChange}
                  placeholder="Example: P1001"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />

              </div>


              {/* Age + Gender */}
              <div className="grid grid-cols-2 gap-4">

                <div>

                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Age *
                  </label>

                  <input
                    type="number"
                    name="age"
                    value={form.age}
                    onChange={handleFormChange}
                    min="0"
                    max="120"
                    placeholder="45"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />

                </div>


                <div>

                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Gender *
                  </label>

                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >

                    <option value="">
                      Select
                    </option>

                    <option value="Male">
                      Male
                    </option>

                    <option value="Female">
                      Female
                    </option>

                    <option value="Other">
                      Other
                    </option>

                  </select>

                </div>

              </div>


              {/* Ward + Bed */}
              <div className="grid grid-cols-2 gap-4">

                <div>

                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Ward *
                  </label>

                  <input
                    name="ward"
                    value={form.ward}
                    onChange={handleFormChange}
                    placeholder="Example: ICU"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />

                </div>


                <div>

                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Bed ID
                  </label>

                  <input
                    name="bed_id"
                    value={form.bed_id}
                    onChange={handleFormChange}
                    placeholder="Example: B-12"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />

                </div>

              </div>


              {/* Doctor */}
              <div>

                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Doctor
                </label>

                <input
                  name="doctor"
                  value={form.doctor}
                  onChange={handleFormChange}
                  placeholder="Example: Dr. Kumar"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />

              </div>


              {/* Status */}
              <div>

                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status
                </label>

                <select
                  name="status"
                  value={form.status}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >

                  <option value="admitted">
                    Admitted
                  </option>

                  <option value="discharged">
                    Discharged
                  </option>

                  <option value="transferred">
                    Transferred
                  </option>

                </select>

              </div>


              {/* Buttons */}
              <div className="flex gap-3 pt-2">

                <button
                  type="button"
                  onClick={closeAddModal}
                  disabled={addLoading}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 disabled:opacity-50"
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                >

                  {addLoading
                    ? 'Adding...'
                    : 'Add Patient'
                  }

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>

  )
}