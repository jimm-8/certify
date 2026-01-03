import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import OdrRequests from "./pages/odr/odr_requests";

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  return (
    <Routes>
      <Route path="/odr" element={<OdrRequests />} />
    </Routes>
  );
}

export default App;
