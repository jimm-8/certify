import React from "react";
import { useNavigate } from "react-router-dom";

const Templates = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-md border border-gray-200 shadow-sm m-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Templates</h2>
        <button
          onClick={() => navigate("/templates/preview")}
          className="px-3 py-1.5 text-xs font-medium text-white bg-[#ee1133] rounded-md hover:bg-red-700 transition-colors"
        >
          Preview Template
        </button>
      </div>
      <p className="text-sm text-gray-500 mt-2">
        Manage and preview certificate templates here.
      </p>
    </div>
  );
};

export default Templates;
