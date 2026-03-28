import api from "./api";

const dashboardService = {
  async getSummary(period = null) {
    const response = await api.get("/dashboard/summary", {
      params: period ? { period } : {},
    });
    return response.data;
  },
};

export default dashboardService;
