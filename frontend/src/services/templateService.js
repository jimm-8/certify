import api from "./api";

const templateService = {
  listTemplates: async () => {
    const resp = await api.get("/templates");
    return resp.data;
  },
  getTemplate: async (name) => {
    const resp = await api.get(`/templates/${encodeURIComponent(name)}`);
    return resp.data;
  },
  updateTemplate: async (name, content) => {
    const resp = await api.put(`/templates/${encodeURIComponent(name)}`, {
      content,
    });
    return resp.data;
  },
};

export default templateService;
