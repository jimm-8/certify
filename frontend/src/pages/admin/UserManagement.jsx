import { useEffect, useState } from "react";
import userService from "../../services/userService";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "user", campus_id: null });
  const [error, setError] = useState("");

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
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await userService.createUser(form);
      setForm({ username: "", email: "", password: "", role: "user", campus_id: null });
      fetch();
    } catch (err) {
      setError(err.response?.data || "Failed to create user");
    }
  };

  return (
    <div className="p-4">
      <h2 className="mb-3">User Management</h2>
      {error && <div className="alert alert-danger">{String(error)}</div>}

      <div className="mb-4">
        <form onSubmit={handleSubmit}>
          <div className="row g-2">
            <div className="col-md-3">
              <input name="username" value={form.username} onChange={handleChange} className="form-control" placeholder="Username" required />
            </div>
            <div className="col-md-3">
              <input name="email" value={form.email} onChange={handleChange} className="form-control" placeholder="Email" required />
            </div>
            <div className="col-md-2">
              <input name="password" value={form.password} onChange={handleChange} className="form-control" placeholder="Password" required />
            </div>
            <div className="col-md-2">
              <select name="role" value={form.role} onChange={handleChange} className="form-select">
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>
            <div className="col-md-1">
              <input name="campus_id" value={form.campus_id || ""} onChange={handleChange} className="form-control" placeholder="Campus ID" />
            </div>
            <div className="col-md-1">
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
