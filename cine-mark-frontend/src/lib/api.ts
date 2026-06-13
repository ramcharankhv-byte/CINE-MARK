import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:8080/api/v1",
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await api.post("/auth/refresh");
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, we might want to trigger a logout here or clear state
        // This will be handled gracefully by AuthProvider
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
