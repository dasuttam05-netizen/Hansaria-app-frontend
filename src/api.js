import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import LocationManagementPage from "./pages/LocationManagementPage";

// ✅ NEW IMPORT
import PendingAdjustment from "./pages/PendingAdjustment";

function App() {
  return (
    <Router>
      <Routes>

        <Route path="/" element={<LoginPage />} />

        <Route path="/dashboard" element={<DashboardPage />} />

        <Route path="/locations" element={<LocationManagementPage />} />

        {/* ✅ NEW ROUTE */}
        <Route path="/pending" element={<PendingAdjustment />} />

      </Routes>
    </Router>
  );
}

export default App;