import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Key, LogOut, Settings, HelpCircle } from "lucide-react";
import authService from "../../services/authService";
import { getTokenPayload } from "../../utils/auth";

const CertifyNavbar = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Real-time clock
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formattedDate = currentTime.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "2-digit",
  });

  const formattedTime = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const payload = getTokenPayload();
  const username = payload?.sub || "User";
  const roleLabel = payload?.role
    ? payload.role.replace("_", " ").toUpperCase()
    : "USER";
  const initials = username
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="w-full">
      <div className="bg-[#343A3F] text-white px-6 py-2 flex justify-between items-center shadow-md">
        <div
          style={{ fontWeight: 900 }}
          className="text-4xl font-inter font-black italic"
        >
          Certify
        </div>

        <div className="flex items-center gap-4 relative" ref={dropdownRef}>
          <div className="text-right">
            <div className="text-sm">{formattedDate}</div>
            <div className="text-lg font-medium">{formattedTime}</div>
          </div>
          <div
            onClick={() => setOpen(!open)}
            className="w-10 h-10 rounded-full bg-white text-[#ee1133] flex items-center justify-center font-semibold shadow-md cursor-pointer"
          >
            {initials || "U"}
          </div>

          {open && (
            <div className="absolute right-0 top-14 w-56 bg-white text-gray-700 rounded-xl shadow-xl border border-gray-100 py-2 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#ee1133] text-white flex items-center justify-center text-sm font-semibold">
                    {initials || "U"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate">
                      {username}
                    </div>
                    <div className="text-[11px] text-gray-500">{roleLabel}</div>
                  </div>
                </div>
              </div>

              <button className="flex items-center gap-2 w-full px-4 py-2.5 hover:bg-gray-100 text-sm text-left">
                <Settings className="w-4 h-4" />
                Settings
              </button>

              <button className="flex items-center gap-2 w-full px-4 py-2.5 hover:bg-gray-100 text-sm text-left">
                <Key className="w-4 h-4" />
                Change Password
              </button>

              <button className="flex items-center gap-2 w-full px-4 py-2.5 hover:bg-gray-100 text-sm text-left">
                <HelpCircle className="w-4 h-4" />
                Get Help
              </button>

              <div className="border-t my-2"></div>

              <button
                onClick={() => {
                  authService.logout();
                  setOpen(false);
                  navigate("/login");
                }}
                className="flex items-center gap-2 w-full px-4 py-2.5 hover:bg-red-50 text-red-600 text-sm text-left"
              >
                <LogOut className="w-4 h-4" />
                Sign-out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CertifyNavbar;
