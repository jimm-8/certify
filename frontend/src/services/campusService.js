import api from "./api";

const campusService = {
  list: async () => {
    const resp = await api.get("/campuses/");
    return resp.data;
  },
};

export default campusService;
