import api from "./api";

const requestService = {
  // track
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
  // certificate types
  async getCertificateTypes() {
    try {
      const response = await api.get("/certificate-types/");
      return response.data;
    } catch (error) {
      console.error("Error fetching certificate types:", error);
      throw error;
    }
  },
  // requests
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
  // get all requests
  getAllRequests: async ({ page = 1, limit = 10, status = null } = {}) => {
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
  // update request status
  updateStatus: async (id, newStatus, notes = "", userName = "") => {
    try {
      const response = await api.patch(`/requests/${id}/status`, {
        new_status: newStatus,
        notes,
        user_name: userName,
      });
      return response.data;
    } catch (error) {
      console.error("Error updating request status:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  },
  // get request notes
  getRequestNotes: async (requestId) => {
    try {
      const response = await api.get(`/requests/${requestId}/notes`);
      return response.data;
    } catch (error) {
      console.error("Error fetching request notes:", error);
      throw error;
    }
  },
  // download certificate
  downloadCertificate: async (requestId) => {
    try {
      const response = await api.get(
        `/requests/${requestId}/download-certificate`,
        {
          responseType: "blob",
        },
      );
      return response.data;
    } catch (error) {
      console.error("Error downloading certificate:", error);
      throw error;
    }
  },
  // send ready email
  sendReadyEmail: async (requestId) => {
    try {
      const response = await api.post(`/requests/${requestId}/notify`);
      return response.data;
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  },

  getPrograms: async (campus = null) => {
    try {
      if (!campus) return [];
      const response = await api.get(
        `/programs/by-campus/${encodeURIComponent(campus)}`,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching programs:", error);
      throw error;
    }
  },
};

export default requestService;
