import { useState, useCallback } from 'react'
import { Plug, RefreshCw, AlertTriangle } from 'lucide-react'
import {
  getIntegrationTestOrders, getIntegrationLabResults,
  getIntegrationScanStatus, getIntegrationSpecialists
} from '../api'
import LoadingSpinner from '../components/LoadingSpinner'

const STUBS = [
  { key: 'orders',     label: 'Test Orders (HIS)',            fn: getIntegrationTestOrders,  color: 'blue' },
  { key: 'lab',        label: 'Lab Results (LIS)',            fn: getIntegrationLabResults,  color: 'green' },
  { key: 'scan',       label: 'Scan Status (RIS)',            fn: getIntegrationScanStatus,  color: 'purple' },
  { key: 'specialist', label: 'Specialist Availability',      fn: getIntegrationSpecialists, color: 'orange' },
]

export default function Integration() {
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState({})

  async function fetch(stub) {
    setLoading(p => ({ ...p, [stub.key]: true }))
    try {
      const res = await stub.fn()
      setResults(p => ({ ...p, [stub.key]: res.data }))
    } catch (err) {
      setResults(p => ({ ...p, [stub.key]: { error: err.response?.data?.error || 'Failed.' } }))
    } finally {
      setLoading(p => ({ ...p, [stub.key]: false }))
    }
  }

  const COLOR_MAP = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Integration Stubs</h2>
        <p className="text-sm text-slate-500">Simulated hospital information system endpoints. Synthetic data only.</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Integration Stubs — Not connected to any real system</p>
          <p className="text-xs text-amber-700 mt-1">
            These endpoints simulate a Hospital Information System (HIS), Laboratory Information System (LIS),
            and Radiology Information System (RIS). In a production deployment they would connect to real
            hospital APIs. All data returned here is synthetic and randomly generated.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {STUBS.map(stub => (
          <div key={stub.key} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className={`px-4 py-3 border-b border-slate-100 flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${loading[stub.key] ? 'bg-amber-400 animate-pulse' : results[stub.key] ? 'bg-green-400' : 'bg-slate-300'}`} />
                <h3 className="text-sm font-semibold text-slate-700">{stub.label}</h3>
              </div>
              <button onClick={() => fetch(stub)}
                disabled={loading[stub.key]}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition ${COLOR_MAP[stub.color]}`}>
                <RefreshCw size={12} className={loading[stub.key] ? 'animate-spin' : ''} />
                {loading[stub.key] ? 'Fetching…' : 'Fetch Stub'}
              </button>
            </div>

            <div className="p-4">
              {loading[stub.key] ? (
                <LoadingSpinner message="Fetching stub data…" />
              ) : results[stub.key] ? (
                results[stub.key].error ? (
                  <p className="text-sm text-red-500">{results[stub.key].error}</p>
                ) : (
                  <>
                    {results[stub.key].banner && (
                      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2 mb-3">
                        ⚠ {results[stub.key].banner}
                      </p>
                    )}
                    <pre className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3 overflow-auto max-h-64 whitespace-pre-wrap">
                      {JSON.stringify(
                        results[stub.key].test_orders ||
                        results[stub.key].lab_results ||
                        results[stub.key].scans ||
                        results[stub.key].specialists || {},
                        null, 2
                      )}
                    </pre>
                  </>
                )
              ) : (
                <p className="text-sm text-slate-400 py-4 text-center">Click "Fetch Stub" to call this integration endpoint.</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-600 mb-2">Available Stub Endpoints</p>
        <div className="space-y-1.5">
          {[
            'GET /api/integration/test-orders       → Simulates HIS test order export',
            'GET /api/integration/lab-results       → Simulates LIS lab result feed',
            'GET /api/integration/scan-status       → Simulates RIS scan status',
            'GET /api/integration/specialist-availability → Simulates specialist roster',
          ].map(e => (
            <p key={e} className="text-xs font-mono text-slate-500">{e}</p>
          ))}
        </div>
      </div>
    </div>
  )
}
