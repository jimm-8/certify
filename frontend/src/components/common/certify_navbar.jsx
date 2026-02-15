import { useState, useEffect, useRef } from "react";
import { Key, LogOut, Settings, HelpCircle } from "lucide-react";

const CertifyNavbar = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  return (
    <div className="w-full">
      {/* Top Bar */}
      <div className="bg-[#ee1133] text-white px-6 py-2 flex justify-between items-center shadow-md">
        <div
          style={{ fontWeight: 900 }}
          className="text-4xl font-inter font-black italic"
        >
          Certify
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4 relative" ref={dropdownRef}>
          <div className="text-right">
            <div className="text-sm">{formattedDate}</div>
            <div className="text-lg font-medium">{formattedTime}</div>
          </div>

          {/* Avatar */}
          <div
            onClick={() => setOpen(!open)}
            className="w-10 h-10 rounded-full bg-white text-[#ee1133] flex items-center justify-center font-semibold shadow-md cursor-pointer"
          >
            JM
          </div>

          {/* Dropdown */}
          {open && (
            <div className="absolute right-0 top-14 w-48 bg-white text-gray-700 rounded-lg shadow-lg border py-2 z-50">
              <button className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-100 text-sm">
                <Settings className="w-4 h-4" />
                Settings
              </button>

              <button className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-100 text-sm">
                <Key className="w-4 h-4" />
                Change Password
              </button>

              <button className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-100 text-sm">
                <HelpCircle className="w-4 h-4" />
                Get Help
              </button>

              <div className="border-t my-2"></div>

              <button className="flex items-center gap-2 w-full px-4 py-2 hover:bg-red-50 text-red-600 text-sm">
                <LogOut className="w-4 h-4" />
                Sign-out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar */}
      {/* <div className="bg-white px-6 py-1 border-b shadow-sm"></div> */}
    </div>
  );
};

export default CertifyNavbar;
