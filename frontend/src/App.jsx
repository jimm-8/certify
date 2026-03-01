import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { useEffect } from "react";
import MainLayout from "./layout/main";
import OdrRequests from "./pages/odr/odr_requests";
import CertifyIndex from "./pages/certify/index";

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
          <MainLayout>
            <CertifyIndex />
          </MainLayout>
        }
      />

      {/* Without Navbar */}
      <Route path="/odr" element={<OdrRequests />} />
    </Routes>
  );
}

export default App;
