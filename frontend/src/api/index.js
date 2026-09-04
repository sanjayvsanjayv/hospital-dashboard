import api from './client'

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = (username, password) =>
  api.post('/auth/login', { username, password })

export const getMe = () => api.get('/auth/me')

// ── Dashboard / Metrics ───────────────────────────────────────────────────────
export const getDashboard = () => api.get('/dashboard')
export const getMetrics   = () => api.get('/metrics')
export const getBaseline  = () => api.get('/baseline')
export const getErrorAnalysis = () => api.get('/error-analysis')
export const getBeds      = () => api.get('/beds')

// ── Patients ──────────────────────────────────────────────────────────────────
export const getPatients = (params = {}) => api.get('/patients', { params })
export const getPatient  = (id) => api.get(`/patients/${id}`)
export const createPatient = (data) => api.post('/patients', data)
export const updatePatient = (id, data) => api.put(`/patients/${id}`, data)

// ── Tests ─────────────────────────────────────────────────────────────────────
export const getTests      = (params = {}) => api.get('/tests', { params })
export const getTest       = (id) => api.get(`/tests/${id}`)
export const createTest    = (data) => api.post('/tests', data)
export const updateTestStatus = (id, data) => api.put(`/tests/${id}/status`, data)

// ── Alerts ────────────────────────────────────────────────────────────────────
export const getAlerts          = (params = {}) => api.get('/alerts', { params })
export const acknowledgeAlert   = (id, data) => api.post(`/alerts/${id}/acknowledge`, data)
export const escalateAlert      = (id, data) => api.post(`/alerts/${id}/escalate`, data)
export const resolveAlert       = (id, data) => api.post(`/alerts/${id}/resolve`, data)
export const markFalsePositive  = (id, data) => api.post(`/alerts/${id}/false-positive`, data)
export const assignAlert        = (id, data) => api.post(`/alerts/${id}/assign`, data)
export const getEscalations     = () => api.get('/alerts/escalations')
export const resolveEscalation  = (id, data) => api.post(`/alerts/escalations/${id}/resolve`, data)

// ── Consent ───────────────────────────────────────────────────────────────────
export const getConsent    = (patientId) => api.get(`/consent/${patientId}`)
export const updateConsent = (patientId, data) => api.post(`/consent/${patientId}`, data)

// ── Integration Stubs ─────────────────────────────────────────────────────────
export const getIntegrationTestOrders    = () => api.get('/integration/test-orders')
export const getIntegrationLabResults    = () => api.get('/integration/lab-results')
export const getIntegrationScanStatus   = () => api.get('/integration/scan-status')
export const getIntegrationSpecialists  = () => api.get('/integration/specialist-availability')

// ── Health ────────────────────────────────────────────────────────────────────
export const getHealth = () => api.get('/health')
