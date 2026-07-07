import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ClientsPage } from '@/pages/clients/ClientsPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DepartmentsPage } from '@/pages/departments/DepartmentsPage';
import { UserCreatePage } from '@/pages/users/UserCreatePage';
import { UserDetailPage } from '@/pages/users/UserDetailPage';
import { UserEditPage } from '@/pages/users/UserEditPage';
import { UserListPage } from '@/pages/users/UserListPage';

export function App() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="users" element={<UserListPage />} />
          <Route path="users/new" element={<UserCreatePage />} />
          <Route path="users/:id" element={<UserDetailPage />} />
          <Route path="users/:id/edit" element={<UserEditPage />} />
          <Route path="departments" element={<DepartmentsPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="*" element={<Navigate to="." replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
