import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import { useEffect } from "react";
import MainLayout from "./layout/main";
import OdrRequests from "./pages/odr/odr_requests";
import CertifyIndex from "./pages/certify/index";
import CertifyDashboard from "./pages/certify/dashboard";
import TemplatePreview from "./pages/templates/TemplatePreview";
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import UserManagement from "./pages/admin/UserManagement";
import RoleManagement from "./pages/admin/RoleManagement";
import RequireAuth from "./components/common/RequireAuth";
import RequireRole from "./components/common/RequireRole";
import AllRequests from "./pages/certify/all_requests";
import Settings from "./pages/certify/settings/settings";
import Faqs from "./pages/certify/settings/faqs";
import AuditLogs from "./pages/certify/settings/auditlogs";
import SignatureManager from "./pages/certify/settings/signatures";
import Templates from "./pages/certify/templates/templates";
import Reports from "./pages/certify/reports";
import Activity from "./pages/certify/activity";
import Notifications from "./pages/certify/notifications";
import Payment from "./pages/certify/cashier/payment";
import { getTokenPayload } from "./utils/auth";

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const location = useLocation();
  const role = getTokenPayload()?.role;

  useEffect(() => {
    if (location.pathname === "/odr") {
      document.title = "Online Document Request";
    }
  }, [location.pathname]);

  if (role === "cashier") {
    return (
      <Routes>
        <Route
          path="/payment-tagging"
          element={
            <RequireRole
              roles={[
                "superadmin",
                "registrar_head",
                "registrar_staff",
                "cashier",
              ]}
            >
              <MainLayout>
                <Payment />
              </MainLayout>
            </RequireRole>
          }
        />
        <Route
          path="/login"
          element={<Navigate to="/payment-tagging" replace />}
        />
        <Route
          path="/forgot-password"
          element={<Navigate to="/payment-tagging" replace />}
        />
        <Route path="*" element={<Navigate to="/payment-tagging" replace />} />
      </Routes>
    );
  }

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
      <Route path="/forgot-password" element={<ForgotPassword />} />

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
        path="/settings/signatures"
        element={
          <RequireRole roles={["superadmin", "registrar_head"]}>
            <MainLayout>
              <SignatureManager />
            </MainLayout>
          </RequireRole>
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

      <Route
        path="/reports"
        element={
          <RequireAuth>
            <MainLayout>
              <Reports />
            </MainLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/activity"
        element={
          <RequireAuth>
            <MainLayout>
              <Activity />
            </MainLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/notifications"
        element={
          <RequireAuth>
            <MainLayout>
              <Notifications />
            </MainLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/payment-tagging"
        element={
          <RequireRole
            roles={[
              "superadmin",
              "registrar_head",
              "registrar_staff",
              "cashier",
            ]}
          >
            <MainLayout>
              <Payment />
            </MainLayout>
          </RequireRole>
        }
      />
    </Routes>
  );
}

export default App;
