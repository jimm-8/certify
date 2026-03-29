import { useEffect, useMemo, useState } from "react";
import rbacService from "../../services/rbacService";

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [activeRoleId, setActiveRoleId] = useState(null);
  const [selectedPerms, setSelectedPerms] = useState([]);
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
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
      setError(err.response?.data || "Failed to load roles");
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
        selectedPerms
      );
      setRoles((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
      setStatus("Saved.");
      setTimeout(() => setStatus(""), 1500);
    } catch (err) {
      setStatus("");
      setError(err.response?.data || "Failed to update role");
    }
  };

  return (
    <div className="p-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="mb-0">Role & Permission Management</h2>
        <button onClick={load} className="btn btn-outline-secondary btn-sm">
          Refresh
        </button>
      </div>
      {error && <div className="alert alert-danger">{String(error)}</div>}

      <div className="row g-3">
        <div className="col-md-4">
          <div className="border rounded p-3 h-100">
            <div className="fw-semibold mb-2">Roles</div>
            <div className="list-group">
              {roles.map((role) => (
                <button
                  key={role.id}
                  className={`list-group-item list-group-item-action ${
                    activeRoleId === role.id ? "active" : ""
                  }`}
                  onClick={() => setActiveRoleId(role.id)}
                >
                  {role.name}
                </button>
              ))}
              {roles.length === 0 && (
                <div className="text-muted small">No roles found.</div>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <div className="border rounded p-3 h-100">
            <div className="d-flex align-items-center justify-content-between">
              <div className="fw-semibold">
                Permissions for {activeRole?.name || "role"}
              </div>
              <div className="d-flex align-items-center gap-2">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Filter permissions"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
                <button onClick={handleSave} className="btn btn-primary btn-sm">
                  Save
                </button>
              </div>
            </div>

            <div className="row g-2 mt-2" style={{ maxHeight: 320, overflowY: "auto" }}>
              {filteredPermissions.map((perm) => (
                <div key={perm.id} className="col-md-6">
                  <label className="d-flex align-items-center gap-2 small">
                    <input
                      type="checkbox"
                      checked={selectedPerms.includes(perm.name)}
                      onChange={() => togglePerm(perm.name)}
                    />
                    <span>{perm.name}</span>
                  </label>
                </div>
              ))}
              {filteredPermissions.length === 0 && (
                <div className="text-muted small">No permissions found.</div>
              )}
            </div>

            {status && <div className="text-muted small mt-2">{status}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
