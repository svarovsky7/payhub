import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, App as AntdApp } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import { AuthProvider } from './contexts/AuthContext'
import { AuthPage } from './pages/AuthPage'
import { InvoicesPage } from './pages/InvoicesPage'
import { AdminPage } from './pages/AdminPage'
import { ApprovalsPage } from './pages/ApprovalsPage'
import { ContractsPage } from './pages/ContractsPage'
import { MaterialRequestsPage } from './pages/MaterialRequestsPage'
import { ProjectBudgetsPage } from './pages/ProjectBudgetsPage'
import { LettersPage } from './pages/LettersPage'
import { LetterStatsPage } from './pages/LetterStatsPage'
import LetterSharePage from './pages/LetterSharePage'
import { MainLayout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import 'antd/dist/reset.css'

function App() {

  return (
    <ConfigProvider locale={ruRU}>
      <AntdApp>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
            <Route path="/login" element={<AuthPage />} />
            <Route path="/letter-share/:token" element={<LetterSharePage />} />
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
        </AuthProvider>
      </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  )
}

export default App
