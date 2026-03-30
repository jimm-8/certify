import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTokenPayload } from "../../utils/auth";
import userService from "../../services/userService";
import rbacService from "../../services/rbacService";
import { BsChevronLeft } from "react-icons/bs";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "registrar_staff",
    campus_id: null,
    permissions: [],
  });
  const [error, setError] = useState("");
  const [permissions, setPermissions] = useState([]);
  const [permissionFilter, setPermissionFilter] = useState("");

  const fetch = async () => {
    try {
      const data = await userService.listUsers();
      setUsers(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetch();
    rbacService
      .listPermissions()
      .then((data) => setPermissions(data || []))
      .catch((err) => console.error(err));
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });
  const handlePermissionToggle = (permName) => {
    setForm((prev) => {
      const next = new Set(prev.permissions || []);
      if (next.has(permName)) {
        next.delete(permName);
      } else {
        next.add(permName);
      }
      return { ...prev, permissions: Array.from(next) };
    });
  };

  const filteredPermissions = useMemo(() => {
    const needle = permissionFilter.trim().toLowerCase();
    if (!needle) return permissions;
    return permissions.filter((p) => p.name.toLowerCase().includes(needle));
  }, [permissionFilter, permissions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await userService.createUser(form);
      setForm({
        username: "",
        email: "",
        password: "",
        role: "registrar_staff",
        campus_id: null,
        permissions: [],
      });
      fetch();
    } catch (err) {
      setError(err.response?.data || "Failed to create user");
    }
  };

  return (
    <div className="mt-3 bg-white rounded-md border border-gray-200 shadow-sm p-2">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <button
          onClick={() => navigate("/dashboard")}
          title="Back to Dashboard"
          className="text-lg font-bold text-gray-700 flex items-center gap-1 hover:text-[#B22222] transition-colors  rounded"
        >
          <BsChevronLeft style={{ strokeWidth: "0.5" }} />
          <span>User Management</span>
        </button>
        {getTokenPayload()?.role === "superadmin" && (
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => navigate("/admin/roles")}
          >
            Manage Roles
          </button>
        )}
      </div>
      {error && <div className="alert alert-danger">{String(error)}</div>}

      <div className="mb-4">
        <form onSubmit={handleSubmit}>
          <div className="row g-2 align-items-start">
            <div className="col-md-3">
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                className="form-control"
                placeholder="Username"
                required
              />
            </div>
            <div className="col-md-3">
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                className="form-control"
                placeholder="Email"
                required
              />
            </div>
            <div className="col-md-2">
              <input
                name="password"
                value={form.password}
                onChange={handleChange}
                className="form-control"
                placeholder="Password"
                required
              />
            </div>
            <div className="col-md-2">
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="form-select"
              >
                <option value="superadmin">Superadmin</option>
                <option value="registrar_head">Registrar Head</option>
                <option value="registrar_staff">Registrar Staff</option>
              </select>
            </div>
            <div className="col-md-2">
              <input
                name="campus_id"
                value={form.campus_id || ""}
                onChange={handleChange}
                className="form-control"
                placeholder="Campus ID"
              />
            </div>
            <div className="col-12">
              <div className="border rounded p-2">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <label className="form-label mb-0">
                    Extra Permissions (optional)
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm w-auto"
                    placeholder="Filter permissions"
                    value={permissionFilter}
                    onChange={(e) => setPermissionFilter(e.target.value)}
                  />
                </div>
                <div
                  className="row g-2"
                  style={{ maxHeight: 160, overflowY: "auto" }}
                >
                  {filteredPermissions.map((perm) => (
                    <div key={perm.id} className="col-md-4">
                      <label className="d-flex align-items-center gap-2 small">
                        <input
                          type="checkbox"
                          checked={(form.permissions || []).includes(perm.name)}
                          onChange={() => handlePermissionToggle(perm.name)}
                        />
                        <span>{perm.name}</span>
                      </label>
                    </div>
                  ))}
                  {filteredPermissions.length === 0 && (
                    <div className="text-muted small">
                      No permissions found.
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <button className="btn btn-primary">Create</button>
            </div>
          </div>
        </form>
      </div>

      <table className="table table-sm">
        <thead>
          <tr>
            <th>Username</th>
            <th>Email</th>
            <th>Role</th>
            <th>Campus</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.username}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.campus_id || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
