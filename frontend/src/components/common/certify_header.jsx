import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import { LayoutGrid, Inbox, PackageCheck, History } from "lucide-react";
import { LuRefreshCw } from "react-icons/lu";
import { BsThreeDotsVertical } from "react-icons/bs";
import { getTokenPayload } from "../../utils/auth";
import settingsService from "../../services/settingsService";
import FeedbackDialog from "./feedbackDialog";
import formatApiError from "../../utils/formatApiError";

const tabs = [
  { key: "dashboard", label: "Dashboard", icon: <LayoutGrid size={15} /> },
  { key: "received", label: "Checking Queue", icon: <Inbox size={15} /> },
  {
    key: "processing",
    label: "For Release",
    icon: <LuRefreshCw size={15} />,
  },
  { key: "ready", label: "For Pickup", icon: <PackageCheck size={15} /> },
  {
    key: "history",
    label: "History",
    icon: <History size={15} />,
    showBadge: false,
  },
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

const CertifyHeader = ({ activeTab = 0, onTabChange, tabCounts = {} }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [signingAvailable, setSigningAvailable] = useState(true);
  const [signingLoading, setSigningLoading] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState({
    open: false,
    title: "",
    message: "",
    tone: "default",
  });
  const buttonRef = useRef(null);
  const portalRef = useRef(null);
  const role = getTokenPayload()?.role;
  const navigate = useNavigate();
  const canManageSigning = role !== "cashier";

  const showFeedback = (title, message, tone = "default") => {
    setFeedbackModal({
      open: true,
      title,
      message,
      tone,
    });
  };

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

  useEffect(() => {
    if (!canManageSigning) return;

    let active = true;
    settingsService
      .getSigningAvailability()
      .then((data) => {
        if (!active) return;
        setSigningAvailable(Boolean(data?.signing_available));
      })
      .catch((error) => {
        console.error("Failed to load signing availability:", error);
      });

    return () => {
      active = false;
    };
  }, [canManageSigning]);

  const getTabCount = (tab) => {
    if (!tab.key || tab.showBadge === false) return null;
    const count = tabCounts[tab.key];
    return typeof count === "number" ? count : null;
  };

  return (
    <div className="mt-3">
      <div className="flex h-10 items-stretch overflow-x-auto rounded-md border border-[var(--school-border)] bg-white shadow-sm">
        {/* Tabs */}
        <div className="flex items-stretch">
          {tabs.map((tab, index) => (
            <div key={index} className="flex items-stretch">
              <button
                onClick={() => handleTabClick(index)}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all duration-200
                  ${
                    activeTab === index
                      ? "border-[var(--school-crimson)] bg-[var(--school-ivory)]/60 text-[var(--school-crimson)]"
                      : "border-transparent text-gray-500 hover:border-[var(--school-crimson)] hover:text-[var(--school-ink)]"
                  }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {typeof getTabCount(tab) === "number" && (
                  <span
                    className={`inline-flex min-w-[1.35rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                      activeTab === index
                        ? "bg-[var(--school-crimson)] text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {getTabCount(tab)}
                  </span>
                )}
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
                setDropdownOpen((prev) => !prev);
              }}
              className={`p-2 rounded-md transition-colors flex-shrink-0 ${
                dropdownOpen
                  ? "text-[var(--school-crimson)]"
                  : "text-gray-400 hover:text-[var(--school-crimson)]"
              }`}
            >
              <BsThreeDotsVertical size={16} />
            </button>
          </div>
        </>
        {canManageSigning && (
          <>
            <div className="ml-auto flex items-center gap-3 px-4">
              <label
                htmlFor="signing-availability-toggle"
                className="text-xs font-medium text-gray-600"
              >
                Available for signing
              </label>
              <button
                id="signing-availability-toggle"
                type="button"
                onClick={async () => {
                  const nextValue = !signingAvailable;
                  setSigningLoading(true);
                  try {
                    const response =
                      await settingsService.updateSigningAvailability(
                        nextValue,
                      );
                    setSigningAvailable(Boolean(response?.signing_available));
                  } catch (error) {
                    console.error(
                      "Failed to update signing availability:",
                      error,
                    );
                    showFeedback(
                      "Update Failed",
                      formatApiError(
                        error,
                        "Failed to update signing availability.",
                      ),
                      "error",
                    );
                  } finally {
                    setSigningLoading(false);
                  }
                }}
                disabled={signingLoading}
                aria-pressed={signingAvailable}
                aria-label={
                  signingAvailable
                    ? "Set not available for signing"
                    : "Set available for signing"
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  signingAvailable ? "bg-[#0071ae]" : "bg-gray-300"
                } ${signingLoading ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    signingAvailable ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-[11px] text-gray-400">
                {signingLoading
                  ? "Updating..."
                  : signingAvailable
                    ? "On"
                    : "Off"}
              </span>
            </div>
          </>
        )}
      </div>
      {dropdownOpen && (
        <DropdownPortal
          anchorRef={buttonRef}
          portalRef={portalRef}
          onClose={() => setDropdownOpen(false)}
          sections={sections}
        />
      )}
      <FeedbackDialog
        open={feedbackModal.open}
        title={feedbackModal.title}
        message={feedbackModal.message}
        tone={feedbackModal.tone}
        onClose={() =>
          setFeedbackModal((current) => ({ ...current, open: false }))
        }
      />
    </div>
  );
};

export default CertifyHeader;
