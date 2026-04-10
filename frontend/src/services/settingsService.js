import api from "./api";

const settingsService = {
  getWetSignature: async () => {
    const response = await api.get("/settings/wet-signature");
    return response.data;
  },
  updateWetSignature: async (useWetSignature) => {
    const response = await api.put("/settings/wet-signature", {
      use_wet_signature: useWetSignature,
    });
    return response.data;
  },
};

export default settingsService;
