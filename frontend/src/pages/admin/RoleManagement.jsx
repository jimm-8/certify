import { useEffect, useMemo, useState } from "react";
import rbacService from "../../services/rbacService";
import { BsChevronLeft } from "react-icons/bs";
import { useNavigate } from "react-router-dom";
import FeedbackDialog from "../../components/common/feedbackDialog";
import formatApiError from "../../utils/formatApiError";

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [activeRoleId, setActiveRoleId] = useState(null);
  const [selectedPerms, setSelectedPerms] = useState([]);
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState("");
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

  const load = async () => {
    try {
      const [rolesData, permsData] = await Promise.all([
        rbacService.listRoles(),
        rbacService.listPermissions(),
      ]);
      setRoles(rolesData || []);
      setPermissions(permsData || []);
      if (rolesData?.length) {
        setActiveRoleId(rolesData[0].id);
        setSelectedPerms(rolesData[0].permissions || []);
      }
    } catch (err) {
      showFeedback(
        "Load Failed",
        formatApiError(err, "Failed to load roles."),
        "error",
      );
    }
  };

  useEffect(() => {
    load();
  }, []);

  const activeRole = roles.find((r) => r.id === activeRoleId);

  useEffect(() => {
    if (activeRole) {
      setSelectedPerms(activeRole.permissions || []);
    }
  }, [activeRoleId, roles]);

  const filteredPermissions = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return permissions;
    return permissions.filter((p) => p.name.toLowerCase().includes(needle));
  }, [filter, permissions]);

  const togglePerm = (name) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return Array.from(next);
    });
  };

  const handleSave = async () => {
    if (!activeRoleId) return;
    try {
      setStatus("Saving...");
      const updated = await rbacService.updateRolePermissions(
        activeRoleId,
        selectedPerms,
      );
      setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setStatus("Saved.");
      setTimeout(() => setStatus(""), 1500);
    } catch (err) {
      setStatus("");
      showFeedback(
        "Save Failed",
        formatApiError(err, "Failed to update role."),
        "error",
      );
    }
  };

  return (
    <div className="py-3 space-y-4">
      <div className="bg-white rounded-md border border-gray-200 shadow-sm px-2 py-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard")}
            title="Back to Dashboard"
            className="text-lg font-bold text-gray-700 flex items-center gap-1 hover:text-[#B22222] transition-colors rounded"
          >
            <BsChevronLeft style={{ strokeWidth: "0.5" }} />
            <span>Role & Permission Management</span>
          </button>
          <button
            onClick={load}
            className="text-xs font-semibold px-3 py-1.5 border border-gray-300 rounded-md text-gray-600 hover:text-[#B22222] hover:border-[#B22222] transition-colors"
          >
            Refresh
          </button>
        </div>
        <p className="text-xs text-gray-500 ml-5">
          Manage role access and fine-grained permissions for the system.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6">
          <div className="text-sm font-semibold text-gray-800 mb-2">Roles</div>
          <p className="text-xs text-gray-500 mb-4">
            Select a role to edit its permissions.
          </p>
          <div className="space-y-2">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setActiveRoleId(role.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm border transition-colors ${
                  activeRoleId === role.id
                    ? "border-[#ee1133] bg-red-50 text-[#B22222]"
                    : "border-gray-200 text-gray-700 hover:border-[#ee1133] hover:text-[#B22222]"
                }`}
              >
                {role.name}
              </button>
            ))}
            {roles.length === 0 && (
              <div className="text-xs text-gray-500">No roles found.</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6 lg:col-span-2">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-800">
                Permissions for {activeRole?.name || "role"}
              </div>
              <p className="text-xs text-gray-500">
                Toggle permissions to control access for this role.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="border border-gray-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-200"
                placeholder="Filter permissions"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <button
                onClick={handleSave}
                className="bg-[#ee1133] hover:bg-[#c50f2a] text-white text-xs font-semibold px-3 py-2 rounded-md transition-colors"
              >
                Save
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-80 overflow-y-auto mt-3">
            {filteredPermissions.map((perm) => (
              <label
                key={perm.id}
                className="flex items-center gap-2 text-xs text-gray-700 border border-gray-200 rounded-md px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={selectedPerms.includes(perm.name)}
                  onChange={() => togglePerm(perm.name)}
                />
                <span>{perm.name}</span>
              </label>
            ))}
            {filteredPermissions.length === 0 && (
              <div className="text-xs text-gray-500">No permissions found.</div>
            )}
          </div>

          {status && (
            <div
              className={`text-xs mt-3 rounded-md px-3 py-2 border ${
                status === "Saved."
                  ? "text-green-600 bg-green-50 border-green-200"
                  : "text-gray-600 bg-gray-50 border-gray-200"
              }`}
            >
              {status}
            </div>
          )}
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
}
