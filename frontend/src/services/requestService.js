import api from "./api";
import { getTokenPayload } from "../utils/auth";

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
  getAllRequests: async ({
    page = 1,
    limit = 10,
    status = null,
    ownerUsername = null,
  } = {}) => {
    try {
      const skip = (page - 1) * limit;

      const response = await api.get("/requests/", {
        params: {
          skip,
          limit,
          status_filter: status,
          owner_username: ownerUsername,
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
      const resolvedUser =
        userName || getTokenPayload()?.sub || "System";
      const response = await api.patch(`/requests/${id}/status`, {
        new_status: newStatus,
        notes,
        user_name: resolvedUser,
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
  // get student courses (taken with grades) for a request
  getRequestTakenCourses: async (requestId) => {
    try {
      const response = await api.get(`/requests/${requestId}/taken-courses`);
      return response.data;
    } catch (error) {
      console.error("Error fetching taken courses:", error);
      throw error;
    }
  },
  // update course description selection
  updateCourseDescriptionSelection: async (
    requestId,
    courseCodes = [],
    notes = "",
    userName = "",
  ) => {
    try {
      const resolvedUser =
        userName || getTokenPayload()?.sub || "System";
      const response = await api.patch(
        `/requests/${requestId}/course-description-selection`,
        {
          course_codes: courseCodes,
          notes,
          user_name: resolvedUser,
        },
      );
      return response.data;
    } catch (error) {
      console.error("Error updating course description selection:", error);
      throw error;
    }
  },
  // update certification of grades selection
  updateGradeSelection: async (
    requestId,
    selectionKeys = [],
    notes = "",
    userName = "",
  ) => {
    try {
      const resolvedUser =
        userName || getTokenPayload()?.sub || "System";
      const response = await api.patch(
        `/requests/${requestId}/grade-selection`,
        {
          selection_keys: selectionKeys,
          notes,
          user_name: resolvedUser,
        },
      );
      return response.data;
    } catch (error) {
      console.error("Error updating grade selection:", error);
      throw error;
    }
  },
  // get all audit logs
  getAllAuditLogs: async ({ page = 1, limit = 50 } = {}) => {
    try {
      const skip = (page - 1) * limit;
      const response = await api.get("/requests/audit-logs/all", {
        params: {
          skip,
          limit,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching audit logs:", error);
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
      const response = await api.post(
        `/requests/${requestId}/send-ready-email`,
      );
      return response.data;
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  },
  sendDelayNotice: async (requestId, reason = "") => {
    try {
      const response = await api.post(
        `/requests/${requestId}/send-delay-notice`,
        { reason },
      );
      return response.data;
    } catch (error) {
      console.error("Error sending delay notice:", error);
      throw error;
    }
  },
  holdRequestorNoPickup: async (requestId) => {
    try {
      const response = await api.post(
        `/requests/${requestId}/hold-requestor-no-pickup`,
      );
      return response.data;
    } catch (error) {
      console.error("Error holding request for no pickup:", error);
      throw error;
    }
  },
  // mark as printed (auto print)
  markPrinted: async (requestId) => {
    try {
      const response = await api.post(`/requests/${requestId}/mark-printed`);
      return response.data;
    } catch (error) {
      console.error("Error marking printed:", error);
      throw error;
    }
  },
  // send rejection email
  sendRejectionEmail: async (requestId, notes = "") => {
    try {
      const response = await api.post(
        `/requests/${requestId}/send-rejection-email`,
        { notes },
      );
      return response.data;
    } catch (error) {
      console.error("Error sending rejection email:", error);
      throw error;
    }
  },

  // validate requests against registry
  validateRequests: async (requestIds = []) => {
    try {
      const response = await api.post(`/requests/validate`, {
        request_ids: requestIds,
      });
      return response.data;
    } catch (error) {
      console.error("Error validating requests:", error);
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
