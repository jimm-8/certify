import api from "./api";

const paymentService = {
  createPayment: async (payload) => {
    try {
      const response = await api.post("/payments/", payload);
      return response.data;
    } catch (error) {
      console.error("Error creating payment:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  },
  lookupByReference: async (referenceNumber) => {
    try {
      const response = await api.get("/payments/lookup", {
        params: { reference_number: referenceNumber },
      });
      return response.data;
    } catch (error) {
      console.error("Error looking up payment:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  },
  createPaymentByReference: async (payload) => {
    try {
      const response = await api.post("/payments/by-reference", payload);
      return response.data;
    } catch (error) {
      console.error("Error creating payment by reference:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  },
  getPaymentsByReferences: async (referenceNumbers = []) => {
    try {
      const response = await api.post("/payments/by-references", {
        reference_numbers: referenceNumbers,
      }, {
        timeout: 20000,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching payments by references:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  },
  getUnpaidRequests: async ({ page = 1, limit = 200 } = {}) => {
    try {
      const skip = (page - 1) * limit;
      const response = await api.get("/payments/unpaid-requests", {
        params: { skip, limit },
        timeout: 20000,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching unpaid requests:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  },
};

export default paymentService;
