import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import {
  LayoutGrid,
  SearchCheck,
  Radio,
  CheckCircle,
  History,
} from "lucide-react";
import { BsThreeDotsVertical } from "react-icons/bs";

const tabs = [
  { label: "Dashboard", icon: <LayoutGrid size={15} /> },
  { label: "Checking of Request", icon: <SearchCheck size={15} /> },
  { label: "Request Tracker", icon: <Radio size={15} /> },
  { label: "Ready", icon: <CheckCircle size={15} /> },
  { label: "History", icon: <History size={15} /> },
];

const menuItems = ["Settings", "Template", "FAQs", "Audit Logs"];

const DropdownPortal = ({ anchorRef, onClose }) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.right + window.scrollX - 192, // 192 = w-48
      });
    }
  }, [anchorRef]);

  return ReactDOM.createPortal(
    <div
      style={{ top: position.top, left: position.left }}
      className="absolute w-48 bg-white border border-gray-200 rounded-md shadow-xl z-[9999] overflow-hidden"
    >
      {menuItems.map((item, index) => (
        <button
          key={index}
          onClick={onClose}
          className="w-full text-left px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-100"
        >
          {item}
        </button>
      ))}
    </div>,
    document.body,
  );
};

const CertifyHeader = ({ onTabChange }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const buttonRef = useRef(null);

  const handleTabClick = (index) => {
    setActiveTab(index);
    if (onTabChange) onTabChange(index);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="mx-4 mt-3">
      <div className="bg-white rounded-md border h-10 border-gray-200 shadow-sm flex items-stretch overflow-x-auto">
        {" "}
        {/* Tabs */}
        <div className="flex items-stretch">
          {tabs.map((tab, index) => (
            <div key={index} className="flex items-stretch">
              <button
                onClick={() => handleTabClick(index)}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all duration-200
                  ${
                    activeTab === index
                      ? "border-[#ee1133] text-[#ee1133]"
                      : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
                  }`}
              >
                {tab.icon}
                {tab.label}
              </button>

              {index < tabs.length - 1 && (
                <div className="w-px self-stretch bg-gray-200 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
        <div className="w-px self-stretch bg-gray-200 flex-shrink-0 mx-1" />
        <div className="relative flex items-center" ref={buttonRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className={`p-2 rounded-md transition-colors flex-shrink-0 ${
              dropdownOpen
                ? "text-blue-600 bg-blue-50"
                : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            <BsThreeDotsVertical size={16} />
          </button>
        </div>
      </div>
      {dropdownOpen && (
        <DropdownPortal
          anchorRef={buttonRef}
          onClose={() => setDropdownOpen(false)}
        />
      )}
    </div>
  );
};

export default CertifyHeader;
