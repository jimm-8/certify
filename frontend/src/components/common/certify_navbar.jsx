import { useState, useEffect } from "react";
import { Key, LogOut } from "lucide-react";

const CertifyNavbar = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
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
      <div className="bg-gray-700 text-white px-6 py-3 flex justify-between items-center shadow-md">
        <div className="text-lg font-medium">Batangas State University</div>
        <div className="text-right">
          <div className="text-xs">{formattedDate}</div>
          <div className="text-sm font-medium">{formattedTime}</div>
        </div>
      </div>

      {/* Sign-out and Change Password Bar */}
      <div className="bg-white px-6 py-2 flex justify-between items-center border-b shadow-sm">
        <button className="flex items-center gap-2 text-gray-700 hover:text-gray-900 text-sm">
          <LogOut className="w-4 h-4" />
          <span>Sign-out</span>
        </button>
        <button className="flex items-center gap-2 text-gray-700 hover:text-gray-900 text-sm">
          <Key className="w-4 h-4" />
          <span>Change Password</span>
        </button>
      </div>
    </div>
  );
};

export default CertifyNavbar;
