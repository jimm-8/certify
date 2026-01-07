import api from "./api";

const requestService = {
  /**
   * Track certificate request by reference number and PIN
   * @param {string} referenceNumber - Request reference number
   * @param {string} pin - 4-digit PIN
   * @returns {Promise} Request details
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
   * @returns {Promise} List of certificate types
   */
  getCertificateTypes: async () => {
    try {
      const response = await api.get("/certificate-types/");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create new certificate request
   * @param {Object} requestData - Request data
   * @returns {Promise} Created request with reference number and PIN
   */
  createRequest: async (requestData) => {
    try {
      const response = await api.post("/requests/", requestData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default requestService;
