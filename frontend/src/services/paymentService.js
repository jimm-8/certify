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
};

export default paymentService;
