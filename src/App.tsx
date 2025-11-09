import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, App as AntdApp, Spin } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import { AuthProvider } from './contexts/AuthContext'
import { MainLayout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import 'antd/dist/reset.css'

const AuthPage = lazy(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage })))
const InvoicesPage = lazy(() => import('./pages/InvoicesPage').then(m => ({ default: m.InvoicesPage })))
const AdminPage = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })))
const ApprovalsPage = lazy(() => import('./pages/ApprovalsPage').then(m => ({ default: m.ApprovalsPage })))
const ContractsPage = lazy(() => import('./pages/ContractsPage').then(m => ({ default: m.ContractsPage })))
const MaterialRequestsPage = lazy(() => import('./pages/MaterialRequestsPage').then(m => ({ default: m.MaterialRequestsPage })))
const ProjectBudgetsPage = lazy(() => import('./pages/ProjectBudgetsPage').then(m => ({ default: m.ProjectBudgetsPage })))
const LettersPage = lazy(() => import('./pages/LettersPage').then(m => ({ default: m.LettersPage })))
const LetterStatsPage = lazy(() => import('./pages/LetterStatsPage').then(m => ({ default: m.LetterStatsPage })))
const LetterSharePage = lazy(() => import('./pages/LetterSharePage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })))

function App() {

  return (
    <ConfigProvider locale={ruRU}>
      <AntdApp>
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>}>
            <Routes>
            <Route path="/login" element={<AuthPage />} />
            <Route path="/letter-share/:token" element={<LetterSharePage />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute requiredPath="/profile">
                  <MainLayout>
                    <ProfilePage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoices"
              element={
                <ProtectedRoute requiredPath="/invoices">
                  <MainLayout>
                    <InvoicesPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute requiredPath="/admin">
                  <MainLayout>
                    <AdminPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/approvals"
              element={
                <ProtectedRoute requiredPath="/approvals">
                  <MainLayout>
                    <ApprovalsPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/contracts"
              element={
                <ProtectedRoute requiredPath="/contracts">
                  <MainLayout>
                    <ContractsPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/material-requests"
              element={
                <ProtectedRoute requiredPath="/material-requests">
                  <MainLayout>
                    <MaterialRequestsPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/project-budgets"
              element={
                <ProtectedRoute requiredPath="/project-budgets">
                  <MainLayout>
                    <ProjectBudgetsPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/letters"
              element={
                <ProtectedRoute requiredPath="/letters">
                  <MainLayout>
                    <LettersPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/letter-stats"
              element={
                <ProtectedRoute requiredPath="/letters">
                  <MainLayout>
                    <LetterStatsPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
            </Suspense>
        </AuthProvider>
      </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  )
}

export default App
