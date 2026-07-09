import React, { useState } from "react";
import {
  LayoutGrid,
  SearchCheck,
  CheckCircle,
  Clock,
  History,
  MoreVertical,
} from "lucide-react";

import CertifyNavbar from "../../../components/common/certify_navbar";

const CertifyDashboard = () => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top Navbar */}
      <CertifyNavbar />

      <div className="flex flex-1">
        {/* Sidebar */}={/* Main Content */}
        <div className="flex-1 py-4">
          {/* ===== Equal Tabs + Auto 3 Dots Column ===== */}
          <div className="bg-white border border-gray-400 grid grid-cols-[repeat(5,1fr)_auto]">
            <Tab icon={<LayoutGrid size={18} />} label="Dashboard" />
            <Tab icon={<SearchCheck size={18} />} label="Checking of Request" />
            <Tab icon={<CheckCircle size={18} />} label="Request Tracker" />
            <Tab icon={<Clock size={18} />} label="Ready" />
            <Tab icon={<History size={18} />} label="History" />

            {/* 3 Dots Column */}
            <div className="border-l border-gray-400 flex items-center justify-center relative px-3 bg-white">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="hover:bg-gray-100 p-2"
              >
                <MoreVertical size={18} />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-12 w-40 bg-white border border-gray-400 shadow-md z-10">
                  <DropdownItem label="Settings" />
                  <DropdownItem label="Template" />
                  <DropdownItem label="Audit Log" />
                </div>
              )}
            </div>
          </div>

          {/* ===== Single Container (Search + Dashboard Together) ===== */}
          <div className="mt-4 bg-white border border-gray-300 p-6">
            {/* Search Row */}
            <div className="flex justify-between items-center mb-6">
              <input
                type="text"
                placeholder="Search here..."
                className="border border-gray-400 px-3 py-2 w-72 text-sm"
              />

              <button className="border border-gray-400 px-4 py-2 text-sm hover:bg-gray-100">
                Filter
              </button>
            </div>

            {/* Dashboard Content */}
            <div>
              <h2 className="text-2xl font-thin text-gray-800">Dashboard</h2>
              <p className="text-gray-600 mt-2">
                Select an option from the sidebar or tabs above to get started.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ===== Small Components ===== */

const Tab = ({ icon, label }) => (
  <button className="border-r border-gray-400 bg-white hover:bg-gray-100 flex items-center justify-center gap-2 py-3 text-sm font-medium">
    {icon}
    {label}
  </button>
);

const DropdownItem = ({ label }) => (
  <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm">
    {label}
  </button>
);

export default CertifyDashboard;
