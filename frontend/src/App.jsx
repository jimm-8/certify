import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { useEffect } from "react";
import MainLayout from "./layout/main";
import OdrRequests from "./pages/odr/odr_requests";
import OdrPayment from "./pages/odr/odr_payment";
import CertifyIndex from "./pages/certify/index";
import CertifyDashboard from './pages/certify/dashboard';
import TemplatePreview from "./pages/templates/TemplatePreview";
import Login from "./pages/auth/Login";
import UserManagement from "./pages/admin/UserManagement";
import RoleManagement from "./pages/admin/RoleManagement";
import RequireAuth from "./components/common/RequireAuth";
import RequireRole from "./components/common/RequireRole";
import AllRequests from "./pages/certify/all_requests";
import Settings from "./pages/certify/settings/settings";
import Faqs from "./pages/certify/settings/faqs";
import AuditLogs from "./pages/certify/settings/auditlogs";
import Templates from "./pages/certify/templates/templates";

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/odr") {
      document.title = "Online Document Request";
    }
  }, [location.pathname]);

  return (
    <Routes>
      {/* With Navbar */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <MainLayout>
              <CertifyIndex />
            </MainLayout>
          </RequireAuth>
        }
      />

      {/* Without Navbar */}
      <Route path="/odr" element={<OdrRequests />} />
      <Route path="/odr-payment" element={<OdrPayment />} />
      <Route path="/odr-payments" element={<OdrPayment />} />

      {/* Dashboard */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <MainLayout>
              <CertifyIndex />
            </MainLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/templates/preview"
        element={
          <RequireAuth>
            <MainLayout>
              <TemplatePreview />
            </MainLayout>
          </RequireAuth>
        }
      />

      <Route path="/login" element={<Login />} />

      <Route
        path="/admin/users"
        element={
          <RequireAuth>
            <MainLayout>
              <UserManagement />
            </MainLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/roles"
        element={
          <RequireRole role="superadmin">
            <MainLayout>
              <RoleManagement />
            </MainLayout>
          </RequireRole>
        }
      />

      <Route
        path="/dashboard/requests"
        element={
          <RequireAuth>
            <MainLayout>
              <AllRequests />
            </MainLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/settings"
        element={
          <RequireAuth>
            <MainLayout>
              <Settings />
            </MainLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/settings/audit-logs"
        element={
          <RequireAuth>
            <MainLayout>
              <AuditLogs />
            </MainLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/faqs"
        element={
          <RequireAuth>
            <MainLayout>
              <Faqs />
            </MainLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/templates"
        element={
          <RequireAuth>
            <MainLayout>
              <Templates />
            </MainLayout>
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export default App;
