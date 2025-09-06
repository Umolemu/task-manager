const API_BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:3000"
    : "https://task-manager-be-6vuq.onrender.com";

export default API_BASE_URL;
