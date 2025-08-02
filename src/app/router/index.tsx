import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/shared/ui';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { MaterialRequestsPage } from '@/pages/MaterialRequestsPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/material-requests',
    element: (
      <ProtectedRoute>
        <MaterialRequestsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/',
    element: <Navigate to="/material-requests" replace />,
  },
  {
    path: '*',
    element: <Navigate to="/material-requests" replace />,
  },
]);