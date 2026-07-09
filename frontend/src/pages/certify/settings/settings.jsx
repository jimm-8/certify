import React, { useEffect, useMemo, useState } from "react";
import { getTokenPayload } from "../../../utils/auth";
import authService from "../../../services/authService";
import userService from "../../../services/userService";
import { useNavigate } from "react-router-dom";
import { BsChevronLeft } from "react-icons/bs";
import FeedbackDialog from "../../../components/common/feedbackDialog";

const Settings = () => {
  const payload = getTokenPayload();
  const username = payload?.sub || "User";
  const roleLabel = payload?.role
    ? payload.role.replace("_", " ").toUpperCase()
    : "USER";

  const initials = useMemo(() => {
    return username
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [username]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [department, setDepartment] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changing, setChanging] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState({
    open: false,
    title: "",
    message: "",
    tone: "default",
  });
  const navigate = useNavigate();

  const showFeedback = (title, message, tone = "default") => {
    setFeedbackModal({
      open: true,
      title,
      message,
      tone,
    });
  };

  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      try {
        const data = await userService.getMe();
        if (!mounted) return;
        setFullName(data.full_name || "");
        setEmail(data.email || "");
        setContact(data.contact_number || "");
        setDepartment(data.department || "");
      } catch (err) {
        if (!mounted) return;
        showFeedback(
          "Profile Load Failed",
          "Failed to load profile details.",
          "error",
        );
      }
    };
    loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="py-3 space-y-4">
      <div className="bg-white rounded-md border border-gray-200 shadow-sm px-2 py-2">
        <button
          onClick={() => navigate("/dashboard")}
          title="Back to Dashboard"
          className="text-lg font-bold  text-gray-700 flex items-center gap-1 hover:text-[#B22222] transition-colors  rounded"
        >
          <BsChevronLeft style={{ strokeWidth: "0.5" }} />
          <span>Profile Settings</span>
        </button>
        <p className="text-xs text-gray-500 ml-5">
          Manage your profile details and account information.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#ee1133] text-white flex items-center justify-center text-lg font-semibold">
              {initials || "U"}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-800 truncate">
                {username}
              </div>
              <div className="text-[11px] text-gray-500">{roleLabel}</div>
            </div>
          </div>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Username</span>
              <span className="font-medium text-gray-800">{username}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Role</span>
              <span className="font-medium text-gray-800">{roleLabel}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Status</span>
              <span className="font-medium text-green-600">Active</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6 lg:col-span-2">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                setSavingProfile(true);
                await userService.updateMe({
                  full_name: fullName,
                  email,
                  contact_number: contact,
                  department,
                });
                showFeedback(
                  "Profile Saved",
                  "Profile details saved.",
                  "success",
                );
              } catch (err) {
                showFeedback(
                  "Save Failed",
                  "Failed to save profile details.",
                  "error",
                );
              } finally {
                setSavingProfile(false);
              }
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter full name"
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">
                  Contact Number
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="e.g. 09xx-xxx-xxxx"
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Registrar Office"
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  readOnly
                  className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">
                  Role
                </label>
                <input
                  type="text"
                  value={roleLabel}
                  readOnly
                  className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-gray-500">
                Profile updates are saved to your account.
              </p>
              <button
                type="submit"
                disabled={savingProfile}
                className="bg-[#ee1133] hover:bg-[#c50f2a] text-white text-sm font-semibold px-4 py-2 rounded-md transition-colors"
              >
                {savingProfile ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6 lg:col-span-2">
          <div className="text-sm font-semibold text-gray-800 mb-2">
            Change Password
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Update your account password. Make sure it is strong and unique.
          </p>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!currentPassword || !newPassword) {
                showFeedback(
                  "Missing Fields",
                  "Please fill in all required fields.",
                  "warning",
                );
                return;
              }
              if (newPassword !== confirmPassword) {
                showFeedback(
                  "Password Mismatch",
                  "New password and confirmation do not match.",
                  "warning",
                );
                return;
              }
              try {
                setChanging(true);
                await authService.changePassword(currentPassword, newPassword);
                showFeedback(
                  "Password Updated",
                  "Password updated successfully.",
                  "success",
                );
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
              } catch (err) {
                showFeedback(
                  "Update Failed",
                  err.response?.data?.detail || "Failed to update password.",
                  "error",
                );
              } finally {
                setChanging(false);
              }
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={changing}
                className="px-4 py-2 text-sm rounded-md bg-[#ee1133] text-white hover:bg-[#c50f2a] disabled:opacity-60"
              >
                {changing ? "Saving..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>
        <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6">
          <div className="text-sm font-semibold text-gray-800 mb-2">
            Password Tips
          </div>
          <ul className="text-xs text-gray-600 space-y-2 list-disc list-inside">
            <li>Use at least 8 characters.</li>
            <li>Mix uppercase, lowercase, numbers, and symbols.</li>
            <li>Avoid reusing old passwords.</li>
            <li>Keep it private and do not share.</li>
          </ul>
        </div>
      </div>
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

export default Settings;
