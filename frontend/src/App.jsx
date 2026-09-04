import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

import Login        from './pages/Login'
import Dashboard    from './pages/Dashboard'
import Patients     from './pages/Patients'
import PatientDetail from './pages/PatientDetail'
import Tests        from './pages/Tests'
import Alerts       from './pages/Alerts'
import Baseline     from './pages/Baseline'
import ErrorAnalysis from './pages/ErrorAnalysis'
import Consent      from './pages/Consent'
import Integration  from './pages/Integration'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Layout><Dashboard /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/patients" element={
        <ProtectedRoute roles={['admin','doctor','nurse','specialist']}>
          <Layout><Patients /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/patients/:id" element={
        <ProtectedRoute roles={['admin','doctor','nurse','specialist']}>
          <Layout><PatientDetail /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/tests" element={
        <ProtectedRoute roles={['admin','doctor','nurse','lab']}>
          <Layout><Tests /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/alerts" element={
        <ProtectedRoute>
          <Layout><Alerts /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/baseline" element={
        <ProtectedRoute roles={['admin','doctor']}>
          <Layout><Baseline /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/error-analysis" element={
        <ProtectedRoute roles={['admin','doctor']}>
          <Layout><ErrorAnalysis /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/consent" element={
        <ProtectedRoute roles={['admin','doctor','nurse']}>
          <Layout><Consent /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/integration" element={
        <ProtectedRoute roles={['admin']}>
          <Layout><Integration /></Layout>
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
