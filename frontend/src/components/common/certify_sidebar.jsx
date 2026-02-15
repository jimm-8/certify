import React, { useState } from "react";
import {
  LayoutDashboard,
  FileText,
  History,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
} from "lucide-react";

const menu = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "requests",
    label: "Requests",
    icon: FileText,
    children: [
      { id: "pending", label: "Pending" },
      { id: "processing", label: "Processing" },
      { id: "ready", label: "Ready" },
    ],
  },
  {
    id: "history",
    label: "History",
    icon: History,
  },
  {
    id: "reports",
    label: "Reports",
    icon: BarChart3,
  },
  {
    id: "audit",
    label: "Audit Log",
    icon: ShieldCheck,
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
  },
];

const CertifySidebar = () => {
  const [collapsed, setCollapsed] = useState(true);
  const [openParent, setOpenParent] = useState("requests");
  const [activeItem, setActiveItem] = useState("pending");
  const [hoveredItem, setHoveredItem] = useState(null);
  const [pinnedItem, setPinnedItem] = useState(null);

  const toggleParent = (id) => {
    setOpenParent(openParent === id ? null : id);
  };

  return (
    <div
      className={`h-screen bg-[#222222] text-white flex flex-col shadow-lg transition-all duration-300
      ${collapsed ? "w-20" : "w-64"}`}
    >
      {/* Toggle Button */}
      <div
        className={`flex items-center px-2 py-2
        ${collapsed ? "justify-center" : "justify-end"}`}
      >
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-[#333333] transition"
        >
          {collapsed ? (
            <PanelLeftOpen size={25} />
          ) : (
            <PanelLeftClose size={25} />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-2 relative">
        {menu.map((item) => {
          const Icon = item.icon;

          const isParentActive =
            activeItem === item.id ||
            item.children?.some((child) => child.id === activeItem);

          return (
            <div
              key={item.id}
              className="relative"
              onMouseEnter={() => collapsed && setHoveredItem(item.id)}
              onMouseLeave={() => collapsed && setHoveredItem(null)}
            >
              {/* Parent */}
              <button
                onClick={() => {
                  if (item.children) {
                    if (!collapsed) {
                      toggleParent(item.id);
                    } else {
                      setPinnedItem(pinnedItem === item.id ? null : item.id);
                    }
                  } else {
                    setActiveItem(item.id);
                    setPinnedItem(null);
                  }
                }}
                className={`w-full flex items-center rounded-lg transition
                hover:bg-[#333333]
                ${
                  collapsed
                    ? "justify-center py-4"
                    : "justify-between px-3 py-3"
                }`}
              >
                <div
                  className={`flex items-center ${
                    collapsed ? "justify-center w-full" : "gap-3"
                  } ${isParentActive ? "text-[#ee1133]" : "text-white"}`}
                >
                  <Icon size={22} />
                  {!collapsed && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}
                </div>

                {!collapsed &&
                  item.children &&
                  (openParent === item.id ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  ))}
              </button>

              {/* Expanded Mode Children */}
              {!collapsed && item.children && openParent === item.id && (
                <div className="ml-8 mt-2 space-y-1">
                  {item.children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => setActiveItem(child.id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition
                        ${
                          activeItem === child.id
                            ? "text-[#ee1133]"
                            : "text-gray-300 hover:text-white hover:bg-[#333333]"
                        }`}
                    >
                      {child.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Collapsed Hover Flyout */}
              {collapsed &&
                (hoveredItem === item.id || pinnedItem === item.id) && (
                  <div
                    className="absolute left-full top-0 ml-2 bg-[#222222]
                    rounded-r shadow-2xl z-[999] min-w-[180px]"
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    {item.children ? (
                      <div className="py-2">
                        <div className="px-4 py-2 text-sm font-medium text-white border-b border-[#3a3a3a]">
                          {item.label}
                        </div>
                        <div className="py-1">
                          {item.children.map((child) => (
                            <button
                              key={child.id}
                              onClick={() => {
                                setActiveItem(child.id);
                                setPinnedItem(null);
                                setHoveredItem(null);
                              }}
                              className={`block w-full text-left px-4 py-2 text-sm transition
                              ${
                                activeItem === child.id
                                  ? "text-[#ee1133]"
                                  : "text-gray-300 hover:bg-[#3a3a3a] hover:text-white"
                              }`}
                            >
                              {child.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 py-2 text-sm font-medium text-white">
                        {item.label}
                      </div>
                    )}
                  </div>
                )}
            </div>
          );
        })}
      </nav>
    </div>
  );
};

export default CertifySidebar;
