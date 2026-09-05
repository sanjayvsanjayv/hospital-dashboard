import { useEffect, useState, useCallback } from 'react'
import {
  FlaskConical,
  Search,
  ChevronRight,
  AlertTriangle,
  Plus,
} from 'lucide-react'

import {
  getTests,
  updateTestStatus,
  createTest,
} from '../api'

import { useAuth } from '../context/AuthContext'
import RiskBadge from '../components/RiskBadge'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import Modal from '../components/Modal'


// ─────────────────────────────────────────────────────────────────────────────
// Status transitions
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_TRANSITIONS = {
  pending: [
    'specimen_collected',
    'scan_started',
    'completed',
  ],

  specimen_collected: [
    'report_ready',
    'completed',
  ],

  scan_started: [
    'report_ready',
    'completed',
  ],

  report_ready: [
    'doctor_reviewed',
    'completed',
  ],

  doctor_reviewed: [
    'completed',
  ],
}


// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function Tests() {

  const { user } = useAuth()

  const [tests, setTests] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [status, setStatus] = useState('')
  const [urgency, setUrgency] = useState('')
  const [search, setSearch] = useState('')

  // Update status modal
  const [selectedTest, setSelectedTest] = useState(null)
  const [updateModal, setUpdateModal] = useState(false)
  const [updateLoading, setUpdateLoading] = useState(false)

  // Add diagnostic test modal
  const [addModal, setAddModal] = useState(false)
  const [addLoading, setAddLoading] = useState(false)

  // Diagnostic test form
  const [form, setForm] = useState({
    patient_id: '',
    test_type: '',
    urgency: 'routine',
    stage: '',
    status: 'pending',
  })


  // ───────────────────────────────────────────────────────────────────────────
  // Load Tests
  // ───────────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {

    setLoading(true)
    setError('')

    try {

      const params = {}

      if (status) {
        params.status = status
      }

      if (urgency) {
        params.urgency = urgency
      }

      if (search) {
        params.search = search
      }

      const response = await getTests(params)

      setTests(response.data?.tests || response.data || [])

    } catch (err) {

      console.error(err)

      setError(
        err.response?.data?.error ||
        'Failed to load diagnostic tests.'
      )

    } finally {

      setLoading(false)

    }

  }, [status, urgency, search])


  useEffect(() => {
    load()
  }, [load])


  // ───────────────────────────────────────────────────────────────────────────
  // Add Diagnostic Test
  // ───────────────────────────────────────────────────────────────────────────

  async function handleCreate() {

    if (!form.patient_id.trim()) {

      alert('Patient ID is required.')

      return
    }

    if (!form.test_type.trim()) {

      alert('Test Type is required.')

      return
    }

    setAddLoading(true)

    try {

      await createTest(form)

      alert('Diagnostic test added successfully!')

      // Reset form
      setForm({
        patient_id: '',
        test_type: '',
        urgency: 'routine',
        stage: '',
        status: 'pending',
      })

      // Close modal
      setAddModal(false)

      // Refresh table
      await load()

    } catch (err) {

      console.error(err)

      alert(
        err.response?.data?.error ||
        'Failed to create diagnostic test.'
      )

    } finally {

      setAddLoading(false)

    }
  }


  // ───────────────────────────────────────────────────────────────────────────
  // Update Test Status
  // ───────────────────────────────────────────────────────────────────────────

  function openUpdateModal(test) {

    setSelectedTest(test)

    setUpdateModal(true)

  }


  async function handleStatusUpdate(newStatus) {

    if (!selectedTest) {
      return
    }

    setUpdateLoading(true)

    try {

      await updateTestStatus(
        selectedTest.id || selectedTest.test_id,
        {
          status: newStatus,
        }
      )

      alert('Test status updated successfully!')

      setUpdateModal(false)

      setSelectedTest(null)

      await load()

    } catch (err) {

      console.error(err)

      alert(
        err.response?.data?.error ||
        'Failed to update test status.'
      )

    } finally {

      setUpdateLoading(false)

    }

  }


  // ───────────────────────────────────────────────────────────────────────────
  // Reset Filters
  // ───────────────────────────────────────────────────────────────────────────

  function resetFilters() {

    setStatus('')
    setUrgency('')
    setSearch('')

  }


  // ───────────────────────────────────────────────────────────────────────────
  // Helpers
  // ───────────────────────────────────────────────────────────────────────────

  function getNextStatuses(currentStatus) {

    return STATUS_TRANSITIONS[currentStatus] || []

  }


  function formatStatus(value) {

    if (!value) {
      return '-'
    }

    return value
      .replaceAll('_', ' ')
      .replace(/\b\w/g, char => char.toUpperCase())

  }


  // ───────────────────────────────────────────────────────────────────────────
  // Loading
  // ───────────────────────────────────────────────────────────────────────────

  if (loading && tests.length === 0) {

    return (
      <div className="flex justify-center items-center min-h-[400px]">

        <LoadingSpinner />

      </div>
    )

  }


  // ───────────────────────────────────────────────────────────────────────────
  // Page
  // ───────────────────────────────────────────────────────────────────────────

  return (

    <div className="space-y-6">

      {/* ─────────────────────────────────────────────────────────────── */}
      {/* Header */}
      {/* ─────────────────────────────────────────────────────────────── */}

      <div className="flex items-center justify-between gap-4">

        <div>

          <div className="flex items-center gap-3">

            <div className="p-2 bg-blue-100 rounded-lg">

              <FlaskConical
                size={24}
                className="text-blue-600"
              />

            </div>

            <div>

              <h2 className="text-xl font-bold text-slate-800">

                Diagnostic Tests

              </h2>

              <p className="text-sm text-slate-500">

                Manage diagnostic tests and test workflow

              </p>

            </div>

          </div>

        </div>


        {/* Add Diagnostic Test */}

        {user?.role !== 'specialist' && (

          <button
            onClick={() => setAddModal(true)}
            className="
              flex items-center gap-2
              px-4 py-2.5
              bg-blue-600
              text-white
              rounded-lg
              text-sm
              font-semibold
              hover:bg-blue-700
              transition
              shadow-sm
            "
          >

            <Plus size={18} />

            Add Diagnostic Test

          </button>

        )}

      </div>


      {/* ─────────────────────────────────────────────────────────────── */}
      {/* Error */}
      {/* ─────────────────────────────────────────────────────────────── */}

      {error && (

        <ErrorMessage message={error} />

      )}


      {/* ─────────────────────────────────────────────────────────────── */}
      {/* Filters */}
      {/* ─────────────────────────────────────────────────────────────── */}

      <div className="bg-white border border-slate-200 rounded-xl p-4">

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

          {/* Search */}

          <div className="relative">

            <Search
              size={18}
              className="
                absolute
                left-3
                top-1/2
                -translate-y-1/2
                text-slate-400
              "
            />

            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search test or patient..."
              className="
                w-full
                pl-10
                pr-3
                py-2.5
                border
                border-slate-200
                rounded-lg
                text-sm
                focus:outline-none
                focus:ring-2
                focus:ring-blue-500/30
              "
            />

          </div>


          {/* Status */}

          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="
              px-3
              py-2.5
              border
              border-slate-200
              rounded-lg
              text-sm
              bg-white
            "
          >

            <option value="">All Status</option>

            <option value="pending">
              Pending
            </option>

            <option value="specimen_collected">
              Specimen Collected
            </option>

            <option value="scan_started">
              Scan Started
            </option>

            <option value="report_ready">
              Report Ready
            </option>

            <option value="doctor_reviewed">
              Doctor Reviewed
            </option>

            <option value="completed">
              Completed
            </option>

          </select>


          {/* Urgency */}

          <select
            value={urgency}
            onChange={e => setUrgency(e.target.value)}
            className="
              px-3
              py-2.5
              border
              border-slate-200
              rounded-lg
              text-sm
              bg-white
            "
          >

            <option value="">All Urgency</option>

            <option value="routine">
              Routine
            </option>

            <option value="urgent">
              Urgent
            </option>

            <option value="critical">
              Critical
            </option>

          </select>


          {/* Reset */}

          <button
            onClick={resetFilters}
            className="
              px-4
              py-2.5
              bg-slate-100
              text-slate-700
              rounded-lg
              text-sm
              font-medium
              hover:bg-slate-200
            "
          >

            Reset Filters

          </button>

        </div>

      </div>


      {/* ─────────────────────────────────────────────────────────────── */}
      {/* Tests Table */}
      {/* ─────────────────────────────────────────────────────────────── */}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

        <div className="overflow-x-auto">

          <table className="w-full">

            <thead className="bg-slate-50 border-b border-slate-200">

              <tr>

                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                  Test ID
                </th>

                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                  Patient
                </th>

                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                  Test Type
                </th>

                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                  Urgency
                </th>

                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                  Stage
                </th>

                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                  Delay
                </th>

                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                  Risk
                </th>

                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                  Status
                </th>

                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                  Blocker
                </th>

                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">
                  Action
                </th>

              </tr>

            </thead>


            <tbody className="divide-y divide-slate-100">

              {tests.length === 0 ? (

                <tr>

                  <td
                    colSpan="10"
                    className="
                      px-4
                      py-12
                      text-center
                      text-slate-500
                    "
                  >

                    No diagnostic tests found.

                  </td>

                </tr>

              ) : (

                tests.map(test => {

                  const testId =
                    test.id ||
                    test.test_id ||
                    '-'

                  const patientId =
                    test.patient_id ||
                    test.patientId ||
                    '-'

                  const testType =
                    test.test_type ||
                    test.testType ||
                    '-'

                  const currentStatus =
                    test.status ||
                    'pending'

                  const nextStatuses =
                    getNextStatuses(currentStatus)

                  return (

                    <tr
                      key={testId}
                      className="hover:bg-slate-50"
                    >

                      {/* Test ID */}

                      <td className="px-4 py-4">

                        <span className="font-semibold text-slate-800">

                          {testId}

                        </span>

                      </td>


                      {/* Patient */}

                      <td className="px-4 py-4">

                        <div className="font-medium text-slate-800">

                          {patientId}

                        </div>

                        {test.patient_name && (

                          <div className="text-xs text-slate-500">

                            {test.patient_name}

                          </div>

                        )}

                      </td>


                      {/* Test Type */}

                      <td className="px-4 py-4">

                        <span className="text-sm text-slate-700">

                          {testType}

                        </span>

                      </td>


                      {/* Urgency */}

                      <td className="px-4 py-4">

                        <span
                          className={`
                            inline-flex
                            px-2.5
                            py-1
                            rounded-full
                            text-xs
                            font-semibold

                            ${
                              test.urgency === 'critical'
                                ? 'bg-red-100 text-red-700'
                                : test.urgency === 'urgent'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-slate-100 text-slate-700'
                            }
                          `}
                        >

                          {formatStatus(test.urgency)}

                        </span>

                      </td>


                      {/* Stage */}

                      <td className="px-4 py-4">

                        <span className="text-sm text-slate-700">

                          {formatStatus(
                            test.stage ||
                            test.current_stage
                          )}

                        </span>

                      </td>


                      {/* Delay */}

                      <td className="px-4 py-4">

                        {test.delay_minutes !== undefined ? (

                          <span
                            className={`
                              text-sm font-semibold
                              ${
                                test.delay_minutes > 60
                                  ? 'text-red-600'
                                  : test.delay_minutes > 30
                                    ? 'text-orange-600'
                                    : 'text-slate-600'
                              }
                            `}
                          >

                            {test.delay_minutes} min

                          </span>

                        ) : (

                          <span className="text-slate-400">

                            -

                          </span>

                        )}

                      </td>


                      {/* Risk */}

                      <td className="px-4 py-4">

                        {test.risk_level ? (

                          <RiskBadge
                            level={test.risk_level}
                          />

                        ) : (

                          <span className="text-slate-400">
                            -
                          </span>

                        )}

                      </td>


                      {/* Status */}

                      <td className="px-4 py-4">

                        <StatusBadge
                          status={currentStatus}
                        />

                      </td>


                      {/* Blocker */}

                      <td className="px-4 py-4">

                        {test.blocker ? (

                          <div className="flex items-center gap-2">

                            <AlertTriangle
                              size={16}
                              className="text-orange-500"
                            />

                            <span className="text-sm text-slate-600">

                              {test.blocker}

                            </span>

                          </div>

                        ) : (

                          <span className="text-slate-400">
                            -
                          </span>

                        )}

                      </td>


                      {/* Action */}

                      <td className="px-4 py-4 text-right">

                        {user?.role !== 'specialist' &&
                          nextStatuses.length > 0 ? (

                          <button
                            onClick={() => openUpdateModal(test)}
                            className="
                              inline-flex
                              items-center
                              gap-1
                              px-3
                              py-2
                              bg-blue-50
                              text-blue-700
                              rounded-lg
                              text-xs
                              font-semibold
                              hover:bg-blue-100
                            "
                          >

                            Update

                            <ChevronRight size={14} />

                          </button>

                        ) : (

                          <span className="text-xs text-slate-400">

                            No action

                          </span>

                        )}

                      </td>

                    </tr>

                  )

                })

              )}

            </tbody>

          </table>

        </div>

      </div>


      {/* ─────────────────────────────────────────────────────────────── */}
      {/* Add Diagnostic Test Modal */}
      {/* ─────────────────────────────────────────────────────────────── */}

      <Modal
        open={addModal}
        onClose={() => setAddModal(false)}
        title="Add Diagnostic Test"
      >

        <div className="space-y-4">


          {/* Patient ID */}

          <div>

            <label className="block text-sm font-medium text-slate-700 mb-1">

              Patient ID

            </label>

            <input
              value={form.patient_id}
              onChange={e =>
                setForm(prev => ({
                  ...prev,
                  patient_id: e.target.value,
                }))
              }
              placeholder="Example: P1001"
              className="
                w-full
                px-3
                py-2.5
                border
                border-slate-200
                rounded-lg
                text-sm
                focus:outline-none
                focus:ring-2
                focus:ring-blue-500/30
              "
            />

          </div>


          {/* Test Type */}

          <div>

            <label className="block text-sm font-medium text-slate-700 mb-1">

              Test Type

            </label>

            <input
              value={form.test_type}
              onChange={e =>
                setForm(prev => ({
                  ...prev,
                  test_type: e.target.value,
                }))
              }
              placeholder="Example: Blood Test"
              className="
                w-full
                px-3
                py-2.5
                border
                border-slate-200
                rounded-lg
                text-sm
                focus:outline-none
                focus:ring-2
                focus:ring-blue-500/30
              "
            />

          </div>


          {/* Urgency */}

          <div>

            <label className="block text-sm font-medium text-slate-700 mb-1">

              Urgency

            </label>

            <select
              value={form.urgency}
              onChange={e =>
                setForm(prev => ({
                  ...prev,
                  urgency: e.target.value,
                }))
              }
              className="
                w-full
                px-3
                py-2.5
                border
                border-slate-200
                rounded-lg
                text-sm
                bg-white
              "
            >

              <option value="routine">
                Routine
              </option>

              <option value="urgent">
                Urgent
              </option>

              <option value="critical">
                Critical
              </option>

            </select>

          </div>


          {/* Stage */}

          <div>

            <label className="block text-sm font-medium text-slate-700 mb-1">

              Stage

            </label>

            <select
              value={form.stage}
              onChange={e =>
                setForm(prev => ({
                  ...prev,
                  stage: e.target.value,
                }))
              }
              className="
                w-full
                px-3
                py-2.5
                border
                border-slate-200
                rounded-lg
                text-sm
                bg-white
              "
            >

              <option value="">
                Select Stage
              </option>

              <option value="sample_collection">
                Sample Collection
              </option>

              <option value="scan">
                Scan
              </option>

              <option value="lab_processing">
                Lab Processing
              </option>

              <option value="report">
                Report
              </option>

              <option value="doctor_review">
                Doctor Review
              </option>

            </select>

          </div>


          {/* Buttons */}

          <div className="flex gap-3 pt-2">

            <button
              onClick={handleCreate}
              disabled={addLoading}
              className="
                flex-1
                py-2.5
                bg-blue-600
                text-white
                rounded-lg
                text-sm
                font-semibold
                hover:bg-blue-700
                disabled:opacity-50
              "
            >

              {addLoading
                ? 'Adding...'
                : 'Add Test'
              }

            </button>


            <button
              onClick={() => setAddModal(false)}
              disabled={addLoading}
              className="
                flex-1
                py-2.5
                bg-slate-100
                text-slate-700
                rounded-lg
                text-sm
                font-semibold
                hover:bg-slate-200
              "
            >

              Cancel

            </button>

          </div>

        </div>

      </Modal>


      {/* ─────────────────────────────────────────────────────────────── */}
      {/* Update Status Modal */}
      {/* ─────────────────────────────────────────────────────────────── */}

      <Modal
        open={updateModal}
        onClose={() => {
          if (!updateLoading) {
            setUpdateModal(false)
          }
        }}
        title="Update Test Status"
      >

        {selectedTest && (

          <div className="space-y-4">


            {/* Current Status */}

            <div className="bg-slate-50 rounded-lg p-4">

              <p className="text-xs text-slate-500 mb-1">

                Current Status

              </p>

              <p className="font-semibold text-slate-800">

                {formatStatus(selectedTest.status)}

              </p>

            </div>


            {/* Next Statuses */}

            <div>

              <p className="text-sm font-medium text-slate-700 mb-2">

                Select Next Status

              </p>


              <div className="space-y-2">

                {getNextStatuses(selectedTest.status).map(
                  nextStatus => (

                    <button
                      key={nextStatus}
                      disabled={updateLoading}
                      onClick={() =>
                        handleStatusUpdate(nextStatus)
                      }
                      className="
                        w-full
                        flex
                        items-center
                        justify-between
                        px-4
                        py-3
                        border
                        border-slate-200
                        rounded-lg
                        text-sm
                        font-medium
                        text-slate-700
                        hover:bg-blue-50
                        hover:border-blue-300
                        hover:text-blue-700
                        disabled:opacity-50
                      "
                    >

                      <span>

                        {formatStatus(nextStatus)}

                      </span>

                      <ChevronRight size={16} />

                    </button>

                  )
                )}

              </div>

            </div>


            {/* Cancel */}

            <button
              onClick={() => setUpdateModal(false)}
              disabled={updateLoading}
              className="
                w-full
                py-2.5
                bg-slate-100
                text-slate-700
                rounded-lg
                text-sm
                font-semibold
              "
            >

              Cancel

            </button>

          </div>

        )}

      </Modal>

    </div>

  )

}