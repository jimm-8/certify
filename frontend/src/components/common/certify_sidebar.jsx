import React, { useState } from "react";
import { Key, Menu } from "lucide-react";

const CertifySidebar = () => {
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [activeSubmenu, setActiveSubmenu] = useState(null);

  return (
    <div className="w-80 bg-white shadow-lg flex flex-col">
      {/* Menu Items */}
      <nav className="flex-1 p-6">
        {/* Dashboard */}
        <button
          onClick={() => setActiveMenu("dashboard")}
          className={`flex items-center gap-4 w-full p-4 rounded mb-2 ${
            activeMenu === "dashboard" ? "bg-gray-100" : "hover:bg-gray-50"
          }`}
        >
          <div className="flex gap-1 items-center">
            <div className="w-3 h-3 bg-green-500"></div>
            <div className="w-3 h-3 bg-green-500"></div>
            <div className="w-3 h-3 bg-green-500"></div>
            <div className="w-3 h-3 bg-green-500"></div>
          </div>
          <span className="text-lg font-medium text-gray-800">Dashboard</span>
          {activeMenu === "dashboard" && (
            <div className="ml-auto">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
              </svg>
            </div>
          )}
        </button>

        {/* List of Request */}
        <div className="mb-2">
          <button
            onClick={() =>
              setActiveSubmenu(activeSubmenu === "requests" ? null : "requests")
            }
            className="flex items-center gap-4 w-full p-4 text-gray-700 hover:bg-gray-50 rounded"
          >
            <Menu className="w-5 h-5 text-gray-400" />
            <span className="text-lg font-medium">List of Request</span>
          </button>

          <div className="ml-12 mt-2 border-l-2 border-gray-400 pl-8 space-y-2">
            <button className="block w-full text-left p-2 text-lg text-gray-700 hover:bg-gray-50 rounded">
              Pending
            </button>
            <button className="block w-full text-left p-2 text-lg text-gray-700 hover:bg-gray-50 rounded">
              Processing
            </button>
            <button className="block w-full text-left p-2 text-lg text-gray-700 hover:bg-gray-50 rounded">
              Ready
            </button>
          </div>
        </div>

        {/* History */}
        <button className="flex items-center gap-4 w-full p-4 text-gray-700 hover:bg-gray-50 rounded mt-4">
          <span className="text-lg ml-9">History</span>
        </button>
      </nav>
    </div>
  );
};

export default CertifySidebar;
