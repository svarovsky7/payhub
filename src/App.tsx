import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import { AuthProvider } from './contexts/AuthContext'
import { AuthPage } from './pages/AuthPage'
import { InvoicesPage } from './pages/InvoicesPage'
import { AdminPage } from './pages/AdminPage'
import { MainLayout } from './components/Layout'
import 'antd/dist/reset.css'

function App() {
  console.log('[App] Rendering application')

  return (
    <ConfigProvider locale={ruRU}>
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
              path="/dashboard"
              element={
                <MainLayout>
                  <div>
                    <h1>Дашборд</h1>
                    <p>Здесь будет дашборд с аналитикой</p>
                  </div>
                </MainLayout>
              }
            />
            <Route
              path="/settings"
              element={
                <MainLayout>
                  <div>
                    <h1>Настройки</h1>
                    <p>Здесь будут настройки приложения</p>
                  </div>
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
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App