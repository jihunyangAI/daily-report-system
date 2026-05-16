import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/layout/PrivateRoute.js';
import AppLayout from './components/layout/AppLayout.js';
import LoginPage from './pages/LoginPage.js';
import DashboardPage from './pages/DashboardPage.js';
import MyReportListPage from './pages/MyReportListPage.js';
import TeamReportListPage from './pages/TeamReportListPage.js';
import ReportFormPage from './pages/ReportFormPage.js';
import ReportDetailPage from './pages/ReportDetailPage.js';
import CustomerListPage from './pages/CustomerListPage.js';
import CustomerFormPage from './pages/CustomerFormPage.js';
import SalespersonListPage from './pages/SalespersonListPage.js';
import SalespersonFormPage from './pages/SalespersonFormPage.js';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<PrivateRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/report/my" element={<MyReportListPage />} />
          <Route path="/report/team" element={<TeamReportListPage />} />
          <Route path="/report/new" element={<ReportFormPage />} />
          <Route path="/report/:id" element={<ReportDetailPage />} />
          <Route path="/report/:id/edit" element={<ReportFormPage />} />
          <Route path="/customer" element={<CustomerListPage />} />
          <Route path="/customer/new" element={<CustomerFormPage />} />
          <Route path="/customer/:id/edit" element={<CustomerFormPage />} />
          <Route path="/salesperson" element={<SalespersonListPage />} />
          <Route path="/salesperson/new" element={<SalespersonFormPage />} />
          <Route path="/salesperson/:id/edit" element={<SalespersonFormPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
