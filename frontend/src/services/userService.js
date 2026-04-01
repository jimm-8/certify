import api from "./api";

const userService = {
  listUsers: async () => {
    const resp = await api.get("/users/");
    return resp.data;
  },
  createUser: async (payload) => {
    const resp = await api.post("/users/", payload);
    return resp.data;
  },
  getMe: async () => {
    const resp = await api.get("/users/me");
    return resp.data;
  },
  updateMe: async (payload) => {
    const resp = await api.put("/users/me", payload);
    return resp.data;
  },
};

export default userService;
