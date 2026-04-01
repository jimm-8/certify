import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTokenPayload } from "../../utils/auth";
import userService from "../../services/userService";
import rbacService from "../../services/rbacService";
import campusService from "../../services/campusService";
import { BsChevronLeft } from "react-icons/bs";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    full_name: "",
    email: "",
    password: "",
    contact_number: "",
    department: "",
    role: "registrar_staff",
    campus_id: null,
    permissions: [],
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [permissions, setPermissions] = useState([]);
  const [permissionFilter, setPermissionFilter] = useState("");
  const [campuses, setCampuses] = useState([]);
  const [campusLoading, setCampusLoading] = useState(false);

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
    const loadCampuses = async () => {
      try {
        setCampusLoading(true);
        const data = await campusService.list();
        setCampuses(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setCampusLoading(false);
      }
    };
    loadCampuses();
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const validateForm = () => {
    const nextErrors = {};
    if (!form.username.trim()) nextErrors.username = "Username is required.";
    if (!form.full_name.trim()) nextErrors.full_name = "Full name is required.";
    if (!form.email.trim()) nextErrors.email = "Email is required.";
    if (!form.password.trim()) nextErrors.password = "Password is required.";
    if (!form.contact_number.trim())
      nextErrors.contact_number = "Contact number is required.";
    if (!form.department.trim())
      nextErrors.department = "Department is required.";
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };
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

  const campusNameById = useMemo(() => {
    const map = new Map();
    campuses.forEach((campus) => {
      map.set(String(campus.id), campus.name);
    });
    return map;
  }, [campuses]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      if (!validateForm()) return;
      await userService.createUser(form);
      setForm({
        username: "",
        full_name: "",
        email: "",
        password: "",
        contact_number: "",
        department: "",
        role: "registrar_staff",
        campus_id: null,
        permissions: [],
      });
      setFieldErrors({});
      fetch();
    } catch (err) {
      setError(err.response?.data || "Failed to create user");
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
            <span>User Management</span>
          </button>
          {getTokenPayload()?.role === "superadmin" && (
            <button
              className="text-xs font-semibold px-3 py-1.5 border border-gray-300 rounded-md text-gray-600 hover:text-[#B22222] hover:border-[#B22222] transition-colors"
              onClick={() => navigate("/admin/roles")}
            >
              Manage Roles
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 ml-5">
          Create and manage registrar accounts, roles, and permissions.
        </p>
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {String(error)}
        </div>
      )}

      <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6">
        <div className="text-sm font-semibold text-gray-800 mb-2">
          Create User
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Fill in the details below to add a new registrar account.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">
                Username
              </label>
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                className={`border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 ${
                  fieldErrors.username ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Enter username"
                required
              />
              {fieldErrors.username && (
                <div className="text-[11px] text-red-600">
                  {fieldErrors.username}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">
                Full Name
              </label>
              <input
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                className={`border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 ${
                  fieldErrors.full_name ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Enter full name"
              />
              {fieldErrors.full_name && (
                <div className="text-[11px] text-red-600">
                  {fieldErrors.full_name}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">
                Email Address
              </label>
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                className={`border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 ${
                  fieldErrors.email ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="name@university.edu"
                required
              />
              {fieldErrors.email && (
                <div className="text-[11px] text-red-600">
                  {fieldErrors.email}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className={`border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 ${
                  fieldErrors.password ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Create a password"
                required
              />
              {fieldErrors.password && (
                <div className="text-[11px] text-red-600">
                  {fieldErrors.password}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">
                Contact Number
              </label>
              <input
                name="contact_number"
                value={form.contact_number}
                onChange={handleChange}
                className={`border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 ${
                  fieldErrors.contact_number
                    ? "border-red-300"
                    : "border-gray-300"
                }`}
                placeholder="e.g. 09xx-xxx-xxxx"
              />
              {fieldErrors.contact_number && (
                <div className="text-[11px] text-red-600">
                  {fieldErrors.contact_number}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">
                Department
              </label>
              <input
                name="department"
                value={form.department}
                onChange={handleChange}
                className={`border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 ${
                  fieldErrors.department ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Registrar Office"
              />
              {fieldErrors.department && (
                <div className="text-[11px] text-red-600">
                  {fieldErrors.department}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Role</label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-200"
              >
                <option value="superadmin">Superadmin</option>
                <option value="registrar_head">Registrar Head</option>
                <option value="registrar_staff">Registrar Staff</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">
                Campus
              </label>
              <select
                name="campus_id"
                value={form.campus_id || ""}
                onChange={handleChange}
                disabled={campusLoading}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-200 disabled:bg-gray-50"
              >
                <option value="">
                  {campusLoading ? "Loading campuses..." : "Select campus"}
                </option>
                {campuses.map((campus) => (
                  <option key={campus.id} value={campus.id}>
                    {campus.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border border-gray-200 rounded-md p-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
              <label className="text-xs font-medium text-gray-600">
                Extra Permissions (optional)
              </label>
              <input
                type="text"
                className="border border-gray-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-200"
                placeholder="Filter permissions"
                value={permissionFilter}
                onChange={(e) => setPermissionFilter(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
              {filteredPermissions.map((perm) => (
                <label
                  key={perm.id}
                  className="flex items-center gap-2 text-xs text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={(form.permissions || []).includes(perm.name)}
                    onChange={() => handlePermissionToggle(perm.name)}
                  />
                  <span>{perm.name}</span>
                </label>
              ))}
              {filteredPermissions.length === 0 && (
                <div className="text-xs text-gray-500">
                  No permissions found.
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-[11px] text-gray-500">
              User accounts will inherit their role permissions by default.
            </p>
            <button
              type="submit"
              className="bg-[#ee1133] hover:bg-[#c50f2a] text-white text-sm font-semibold px-4 py-2 rounded-md transition-colors"
            >
              Create User
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6">
        <div className="text-sm font-semibold text-gray-800 mb-2">
          Existing Users
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b">
                <th className="py-2 pr-3">Username</th>
                <th className="py-2 pr-3">Full Name</th>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Contact</th>
                <th className="py-2 pr-3">Department</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Campus</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-3 text-gray-800">{u.username}</td>
                  <td className="py-2 pr-3 text-gray-700">
                    {u.full_name || "-"}
                  </td>
                  <td className="py-2 pr-3 text-gray-700">{u.email}</td>
                  <td className="py-2 pr-3 text-gray-700">
                    {u.contact_number || "-"}
                  </td>
                  <td className="py-2 pr-3 text-gray-700">
                    {u.department || "-"}
                  </td>
                  <td className="py-2 pr-3 text-gray-700">{u.role}</td>
                  <td className="py-2 pr-3 text-gray-700">
                    {u.campus_id
                      ? campusNameById.get(String(u.campus_id)) || u.campus_id
                      : "-"}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td className="py-3 text-xs text-gray-500" colSpan={7}>
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
