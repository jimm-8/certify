import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { useEffect } from "react";
import OdrRequests from "./pages/odr/odr_requests";
import CertifyDashboard from "./pages/certify/certify_dashboard";

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
      <Route path="/" element={<CertifyDashboard />} />
      <Route path="/odr" element={<OdrRequests />} />
    </Routes>
  );
}

export default App;
