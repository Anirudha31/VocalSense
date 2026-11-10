import axios from "axios";

// Axios instance
export const api = axios.create({
  baseURL: "/api",
  timeout: 120000,
});

// Attach authentication token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("vocalsense_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Extract readable error messages from FastAPI responses
export const errMsg = (
  error,
  fallback = "Something went wrong."
) => {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        return item?.msg || "Invalid input";
      })
      .join("; ");
  }

  if (!error?.response) {
    return "Cannot reach the server. Is the backend running on port 8000?";
  }

  return fallback;
};

// Authentication APIs
export const authApi = {
  login: (payload) => api.post("/auth/login", payload),

  register: (payload) => api.post("/auth/register", payload),

  me: () => api.get("/auth/me"),
};

// Dashboard APIs
export const dashboardApi = {
  summary: () => api.get("/dashboard/summary"),

  history: (limit = 100) =>
    api.get("/predictions", {
      params: { limit },
    }),

  models: () => api.get("/models"),

  metrics: () => api.get("/models/metrics"),
};

// Emotion prediction API
export const predictionApi = {
  predict: (file, model) => {
    const formData = new FormData();

    formData.append("audio", file);
    formData.append("model", model);

    return api.post("/predictions", formData);
  },
};
