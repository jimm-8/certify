import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import { LayoutGrid, Inbox, PackageCheck, History } from "lucide-react";
import { LuRefreshCw } from "react-icons/lu";
import { BsThreeDotsVertical } from "react-icons/bs";
import { getTokenPayload } from "../../utils/auth";

const tabs = [
  { label: "Dashboard", icon: <LayoutGrid size={15} /> },
  { label: "Received Request", icon: <Inbox size={15} /> },
  { label: "Under Processing", icon: <LuRefreshCw size={15} /> },
  { label: "For Release", icon: <PackageCheck size={15} /> },
  { label: "History", icon: <History size={15} /> },
];

const baseMenuItems = [
  { label: "Reports" },
  { label: "Template" },
  { label: "FAQs" },
];

const adminMenuItems = [
  { label: "Audit Logs", roles: ["superadmin", "registrar_head"] },
  { label: "User Management", roles: ["superadmin", "registrar_head"] },
  { label: "Signatures", roles: ["superadmin", "registrar_head"] },
  { label: "Role Management", roles: ["superadmin"] },
];

const DropdownPortal = ({ anchorRef, portalRef, onClose, sections }) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY - 6,
        left: rect.right + window.scrollX - 224,
      });
    }
  }, [anchorRef]);

  return ReactDOM.createPortal(
    <div
      ref={portalRef}
      style={{ top: position.top, left: position.left }}
      className="absolute w-56 bg-white border border-gray-100 rounded-xl shadow-xl z-[9999] overflow-hidden"
    >
      {sections.map((section, sIndex) => (
        <div key={section.key || sIndex}>
          {section.title && (
            <div className="px-3 pt-3 pb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
              {section.title}
            </div>
          )}
          {section.items.map((item, index) => (
            <button
              key={`${section.key || sIndex}-${index}`}
              onClick={() => {
                onClose();
                item.onClick?.();
              }}
              className="w-full text-left px-4 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-100"
            >
              {item.label}
            </button>
          ))}
          {sIndex < sections.length - 1 && (
            <div className="h-px bg-gray-100 my-1" />
          )}
        </div>
      ))}
    </div>,
    document.body,
  );
};

const CertifyHeader = ({ onTabChange }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const buttonRef = useRef(null);
  const portalRef = useRef(null);
  const role = getTokenPayload()?.role;
  const navigate = useNavigate();

  const baseItems = baseMenuItems.map((item) => {
    if (item.label === "Reports") {
      return { ...item, onClick: () => navigate("/reports") };
    }
    if (item.label === "Template") {
      return { ...item, onClick: () => navigate("/templates") };
    }
    if (item.label === "FAQs") {
      return { ...item, onClick: () => navigate("/faqs") };
    }
    return item;
  });

  const adminItems = adminMenuItems
    .filter((item) => !item.roles || item.roles.includes(role))
    .map((item) => {
      if (item.label === "User Management") {
        return { ...item, onClick: () => navigate("/admin/users") };
      }
      if (item.label === "Role Management") {
        return { ...item, onClick: () => navigate("/admin/roles") };
      }
      if (item.label === "Audit Logs") {
        return { ...item, onClick: () => navigate("/settings/audit-logs") };
      }
      if (item.label === "Signatures") {
        return { ...item, onClick: () => navigate("/settings/signatures") };
      }
      return item;
    });

  const sections = [
    { key: "general", title: "General", items: baseItems },
    ...(adminItems.length
      ? [{ key: "admin", title: "Admin", items: adminItems }]
      : []),
  ];

  const handleTabClick = (index) => {
    setActiveTab(index);
    setDropdownOpen(false);
    if (onTabChange) onTabChange(index);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      const clickedOutsideButton =
        buttonRef.current && !buttonRef.current.contains(e.target);
      const clickedOutsidePortal =
        portalRef.current && !portalRef.current.contains(e.target);

      if (clickedOutsideButton && clickedOutsidePortal) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="mt-3">
      <div className="bg-white rounded-md border h-10 border-gray-200 shadow-sm flex items-stretch overflow-x-auto">
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
        <>
          <div className="w-px self-stretch bg-gray-200 flex-shrink-0" />
          <div className="relative flex items-center" ref={buttonRef}>
            <button
              onClick={() => {
                setActiveTab(null);
                setDropdownOpen((prev) => !prev);
              }}
              className={`p-2 rounded-md transition-colors flex-shrink-0 ${
                dropdownOpen
                  ? "text-[#ee1133]"
                  : "text-gray-400 hover:text-[#ee1133]"
              }`}
            >
              <BsThreeDotsVertical size={16} />
            </button>
          </div>
        </>
      </div>
      {dropdownOpen && (
        <DropdownPortal
          anchorRef={buttonRef}
          portalRef={portalRef}
          onClose={() => setDropdownOpen(false)}
          sections={sections}
        />
      )}
    </div>
  );
};

export default CertifyHeader;
