import axios from "axios";

const api = axios.create({
  baseURL: "http://10.10.101.22:8000",
});

export default api;
