import api from "./api";

const signatureService = {
  list: async (activeOnly = false) => {
    const resp = await api.get("/signatures/", {
      params: { active_only: activeOnly },
    });
    return resp.data;
  },
  upload: async ({ name, title, campusId, file }) => {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("title", title);
    if (campusId !== null && campusId !== undefined && campusId !== "") {
      formData.append("campus_id", String(campusId));
    }
    formData.append("file", file);

    const resp = await api.post("/signatures/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return resp.data;
  },
  update: async (id, payload) => {
    const resp = await api.patch(`/signatures/${id}`, payload);
    return resp.data;
  },
  remove: async (id) => {
    const resp = await api.delete(`/signatures/${id}`);
    return resp.data;
  },
  fetchFile: async (id) => {
    const resp = await api.get(`/signatures/${id}/file`, {
      responseType: "blob",
    });
    return resp.data;
  },
};

export default signatureService;
