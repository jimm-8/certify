import api from "./api";

const reportService = {
  getSummary: async (period = "all") => {
    const response = await api.get("/reports/summary", {
      params: { period },
    });
    return response.data;
  },
  downloadSummary: async (period = "all") => {
    const response = await api.get("/reports/export", {
      params: { report_type: "summary", period },
      responseType: "blob",
    });
    return response.data;
  },
  downloadRequests: async (params = {}) => {
    const response = await api.get("/reports/requests-export", {
      params,
      responseType: "blob",
    });
    return response.data;
  },
};

export default reportService;
