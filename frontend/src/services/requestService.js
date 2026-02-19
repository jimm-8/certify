import api from "./api";

const requestService = {
  /**
   * Track certificate request by reference number and PIN
   */
  trackRequest: async (referenceNumber, pin) => {
    try {
      const response = await api.get("/requests/track", {
        params: {
          reference_number: referenceNumber,
          pin: pin,
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get all certificate types
   */
  async getCertificateTypes() {
    try {
      const response = await api.get("/certificate-types/");
      return response.data;
    } catch (error) {
      console.error("Error fetching certificate types:", error);
      throw error;
    }
  },

  /**
   * Create new certificate request
   */
  createRequest: async (requestData) => {
    try {
      console.log("Sending request to API:", requestData);
      const response = await api.post("/requests/", requestData);
      console.log("API response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Create request error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  },

  getAllRequests: async ({
    page = 1,
    limit = 10,
    status = null,
  } = {}) => {
    try {
      const skip = (page - 1) * limit;

      const response = await api.get("/requests/", {
        params: {
          skip,
          limit,
          status_filter: status,
        },
      });

      return response.data;
    } catch (error) {
      console.error("Error fetching requests:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  },
};

export default requestService;
