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
  getSigningAvailability: async () => {
    const response = await api.get("/settings/signing-availability");
    return response.data;
  },
  updateSigningAvailability: async (signingAvailable) => {
    const response = await api.put("/settings/signing-availability", {
      signing_available: signingAvailable,
    });
    return response.data;
  },
};

export default settingsService;
