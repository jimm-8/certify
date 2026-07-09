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
  getDefaultTemplate: async (name) => {
    const resp = await api.get(
      `/templates/${encodeURIComponent(name)}?source=defaults`,
    );
    return resp.data;
  },
  updateTemplate: async (name, content, options = {}) => {
    const params = new URLSearchParams();
    if (options.target) {
      params.set("target", options.target);
    }
    const query = params.toString();
    const url = query
      ? `/templates/${encodeURIComponent(name)}?${query}`
      : `/templates/${encodeURIComponent(name)}`;
    const resp = await api.put(url, {
      content,
    });
    return resp.data;
  },
};

export default templateService;
