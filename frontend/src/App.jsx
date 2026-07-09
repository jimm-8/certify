import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";

import MainLayout from "./layout/main";
import RequireAuth from "./components/common/RequireAuth";
import RequireRole from "./components/common/RequireRole";
import { getTokenPayload } from "./utils/auth";

/* ❗ Lazy load ONLY heavy pages */
const OdrRequests = lazy(() => import("./pages/odr/odr_requests"));
const CertifyIndex = lazy(() => import("./pages/certify/index"));
const TemplatePreview = lazy(() => import("./pages/templates/TemplatePreview"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const RoleManagement = lazy(() => import("./pages/admin/RoleManagement"));
const AllRequests = lazy(() => import("./pages/certify/all_requests"));
const Settings = lazy(() => import("./pages/certify/settings/settings"));
const Faqs = lazy(() => import("./pages/certify/settings/faqs"));
const AuditLogs = lazy(() => import("./pages/certify/settings/auditlogs"));
const SignatureManager = lazy(
  () => import("./pages/certify/settings/signatures"),
);
const Templates = lazy(() => import("./pages/certify/templates/templates"));
const Reports = lazy(() => import("./pages/certify/reports"));
const Activity = lazy(() => import("./pages/certify/activity"));
const Notifications = lazy(() => import("./pages/certify/notifications"));
const Payment = lazy(() => import("./pages/certify/cashier/payment"));

/* ❗ DO NOT lazy load small critical pages */
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";

/* Fallback */
function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
      Loading...
    </div>
  );
}

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

  /* CASHIER ROUTES */
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
                "cashier",
              ]}
            >
              <MainLayout>
                <Suspense fallback={<RouteFallback />}>
                  <Payment />
                </Suspense>
              </MainLayout>
            </RequireRole>
          }
        />
        <Route path="*" element={<Navigate to="/payment-tagging" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      {/* Dashboard / Home */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <MainLayout>
              <Suspense fallback={<RouteFallback />}>
                <CertifyIndex />
              </Suspense>
            </MainLayout>
          </RequireAuth>
        }
      />

      {/* ODR (public) */}
      <Route
        path="/odr"
        element={
          <Suspense fallback={<RouteFallback />}>
            <OdrRequests />
          </Suspense>
        }
      />

      {/* Dashboard */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <MainLayout>
              <Suspense fallback={<RouteFallback />}>
                <CertifyIndex />
              </Suspense>
            </MainLayout>
          </RequireAuth>
        }
      />

      {/* Template Preview */}
      <Route
        path="/templates/preview"
        element={
          <RequireAuth>
            <MainLayout>
              <Suspense fallback={<RouteFallback />}>
                <TemplatePreview />
              </Suspense>
            </MainLayout>
          </RequireAuth>
        }
      />

      {/* Auth (NO lazy load) */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Admin */}
      <Route
        path="/admin/users"
        element={
          <RequireRole roles={["superadmin", "registrar_head"]}>
            <MainLayout>
              <Suspense fallback={<RouteFallback />}>
                <UserManagement />
              </Suspense>
            </MainLayout>
          </RequireRole>
        }
      />

      <Route
        path="/admin/roles"
        element={
          <RequireRole role="superadmin">
            <MainLayout>
              <Suspense fallback={<RouteFallback />}>
                <RoleManagement />
              </Suspense>
            </MainLayout>
          </RequireRole>
        }
      />

      {/* Requests */}
      <Route
        path="/dashboard/requests"
        element={
          <RequireAuth>
            <MainLayout>
              <Suspense fallback={<RouteFallback />}>
                <AllRequests />
              </Suspense>
            </MainLayout>
          </RequireAuth>
        }
      />

      {/* Settings */}
      <Route
        path="/settings"
        element={
          <RequireAuth>
            <MainLayout>
              <Suspense fallback={<RouteFallback />}>
                <Settings />
              </Suspense>
            </MainLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/settings/audit-logs"
        element={
          <RequireRole roles={["superadmin", "registrar_head"]}>
            <MainLayout>
              <Suspense fallback={<RouteFallback />}>
                <AuditLogs />
              </Suspense>
            </MainLayout>
          </RequireRole>
        }
      />

      <Route
        path="/settings/signatures"
        element={
          <RequireRole roles={["superadmin", "registrar_head"]}>
            <MainLayout>
              <Suspense fallback={<RouteFallback />}>
                <SignatureManager />
              </Suspense>
            </MainLayout>
          </RequireRole>
        }
      />

      <Route
        path="/faqs"
        element={
          <RequireAuth>
            <MainLayout>
              <Suspense fallback={<RouteFallback />}>
                <Faqs />
              </Suspense>
            </MainLayout>
          </RequireAuth>
        }
      />

      {/* Templates */}
      <Route
        path="/templates"
        element={
          <RequireAuth>
            <MainLayout>
              <Suspense fallback={<RouteFallback />}>
                <Templates />
              </Suspense>
            </MainLayout>
          </RequireAuth>
        }
      />

      {/* Reports */}
      <Route
        path="/reports"
        element={
          <RequireAuth>
            <MainLayout>
              <Suspense fallback={<RouteFallback />}>
                <Reports />
              </Suspense>
            </MainLayout>
          </RequireAuth>
        }
      />

      {/* Activity */}
      <Route
        path="/activity"
        element={
          <RequireAuth>
            <MainLayout>
              <Suspense fallback={<RouteFallback />}>
                <Activity />
              </Suspense>
            </MainLayout>
          </RequireAuth>
        }
      />

      {/* Notifications */}
      <Route
        path="/notifications"
        element={
          <RequireAuth>
            <MainLayout>
              <Suspense fallback={<RouteFallback />}>
                <Notifications />
              </Suspense>
            </MainLayout>
          </RequireAuth>
        }
      />

      {/* Payment */}
      <Route
        path="/payment-tagging"
        element={
          <RequireRole
            roles={[
              "superadmin",
              "registrar_head",
              "cashier",
            ]}
          >
            <MainLayout>
              <Suspense fallback={<RouteFallback />}>
                <Payment />
              </Suspense>
            </MainLayout>
          </RequireRole>
        }
      />
    </Routes>
  );
}

export default App;
