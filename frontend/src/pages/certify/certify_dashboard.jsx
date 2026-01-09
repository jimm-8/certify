import React, { useState } from "react";
import { Key, Menu, LogOut } from "lucide-react";
import CertifyNavbar from "../../components/common/certify_navbar";
import CertifySidebar from "../../components/common/certify_sidebar";

const CertifyDashboard = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Navbar - Full Width at Top */}
      <CertifyNavbar />

      {/* Main Layout with Sidebar and Content */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <CertifySidebar />

        {/* Content Area */}
        <div className="flex-1 p-8 bg-gray-100">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Welcome to Dashboard
            </h2>
            <p className="text-gray-600">
              Select an option from the sidebar to get started.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertifyDashboard;
