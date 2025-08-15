import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from '@/widgets/layout';
import { 
  LoginPage,
  RegisterPage,
  InvoicesPage,
  KanbanPage,
  AdminPage,
  ProfilePage,
  RukstroyApprovalPage,
  DirectorApprovalPage,
  SupplyApprovalPage,
  PaymentPage,
  PaidPage,
  RejectedPage,
} from '@/pages';
import { ProtectedRoute } from './protected-route';

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
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/invoices" replace />,
      },
      {
        path: 'invoices',
        element: <InvoicesPage />,
      },
      {
        path: 'approvals/rukstroy',
        element: <RukstroyApprovalPage />,
      },
      {
        path: 'approvals/director',
        element: <DirectorApprovalPage />,
      },
      {
        path: 'approvals/supply',
        element: <SupplyApprovalPage />,
      },
      {
        path: 'approvals/payment',
        element: <PaymentPage />,
      },
      {
        path: 'approvals/paid',
        element: <PaidPage />,
      },
      {
        path: 'approvals/rejected',
        element: <RejectedPage />,
      },
      {
        path: 'kanban',
        element: <KanbanPage />,
      },
      {
        path: 'admin',
        element: <AdminPage />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
], {
  future: {
    v7_relativeSplatPath: true,
  },
});