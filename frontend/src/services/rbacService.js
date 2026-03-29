import api from "./api";

const rbacService = {
  listPermissions: async () => {
    const resp = await api.get("/rbac/permissions");
    return resp.data;
  },
  listRoles: async () => {
    const resp = await api.get("/rbac/roles");
    return resp.data;
  },
  updateRolePermissions: async (roleId, permissions) => {
    const resp = await api.put(`/rbac/roles/${roleId}/permissions`, {
      permissions,
    });
    return resp.data;
  },
};

export default rbacService;
