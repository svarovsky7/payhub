import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, App as AntdApp } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import { AuthProvider } from './contexts/AuthContext'
import { AuthPage } from './pages/AuthPage'
import { InvoicesPage } from './pages/InvoicesPage'
import { AdminPage } from './pages/AdminPage'
import { ApprovalsPage } from './pages/ApprovalsPage'
import { ContractsPage } from './pages/ContractsPage'
import { MainLayout } from './components/Layout'
import 'antd/dist/reset.css'

function App() {

  return (
    <ConfigProvider locale={ruRU}>
      <AntdApp>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
            <Route path="/login" element={<AuthPage />} />
            <Route
              path="/invoices"
              element={
                <MainLayout>
                  <InvoicesPage />
                </MainLayout>
              }
            />
            <Route
              path="/admin/*"
              element={
                <MainLayout>
                  <AdminPage />
                </MainLayout>
              }
            />
            <Route
              path="/approvals"
              element={
                <MainLayout>
                  <ApprovalsPage />
                </MainLayout>
              }
            />
            <Route
              path="/contracts"
              element={
                <MainLayout>
                  <ContractsPage />
                </MainLayout>
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
