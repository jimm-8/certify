import api from "./api";

const studentService = {
  getStudentBySrCode: async (srCode) => {
    try {
      const response = await api.get(`/mock-student-db/student/${srCode}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching student by SR code:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  },
};

export default studentService;
