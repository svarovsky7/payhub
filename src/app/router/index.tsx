import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute, AppLayout } from '@/shared/ui';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { MaterialRequestsPage } from '@/pages/MaterialRequestsPage';
import { ApprovalsPage } from '@/pages/ApprovalsPage';
import { AdminPage } from '@/pages/AdminPage';

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
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'materials',
        element: <MaterialRequestsPage />,
      },
      {
        path: 'approvals',
        element: <ApprovalsPage />,
      },
      {
        path: 'admin',
        element: <AdminPage />,
      },
      {
        index: true,
        element: <Navigate to="/materials" replace />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/materials" replace />,
  },
]);