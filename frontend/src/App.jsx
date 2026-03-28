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
import RequireAuth from "./components/common/RequireAuth";
import AllRequests from "./pages/certify/all_requests";

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
        path="/dashboard/requests"
        element={
          <RequireAuth>
            <MainLayout>
              <AllRequests />
            </MainLayout>
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export default App;
