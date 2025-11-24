const API_BASE_URL = "/api";

class APIClient {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    // Get auth credentials from sessionStorage
    const credentials = sessionStorage.getItem("auth_credentials");

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(credentials && { Authorization: `Basic ${credentials}` }),
          ...options.headers,
        },
      });

      if (!response.ok) {
        // If unauthorized, redirect to login
        if (response.status === 401) {
          sessionStorage.removeItem("auth_credentials");
          window.location.reload();
        }

        // Try to get error details from response
        let errorDetail = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();

          // Handle FastAPI validation errors (422)
          if (response.status === 422 && errorData.detail) {
            if (Array.isArray(errorData.detail)) {
              // Validation error array
              errorDetail = errorData.detail.map((err) => err.msg).join(", ");
            } else if (typeof errorData.detail === "string") {
              errorDetail = errorData.detail;
            } else {
              errorDetail = JSON.stringify(errorData.detail);
            }
          } else {
            errorDetail = errorData.detail || errorData.message || errorDetail;
          }
        } catch (e) {
          // If parsing fails, use status text
        }

        const error = new Error(errorDetail);
        error.status = response.status;
        error.response = { data: { detail: errorDetail } };
        throw error;
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Services
  async getServices() {
    return this.request("/services/");
  }

  async getService(id) {
    return this.request(`/services/${id}`);
  }

  async createService(data) {
    return this.request("/services/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateService(id, data) {
    return this.request(`/services/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteService(id) {
    return this.request(`/services/${id}`, {
      method: "DELETE",
    });
  }

  async checkService(id) {
    return this.request(`/services/${id}/check`, {
      method: "POST",
    });
  }

  async checkAllServices() {
    return this.request("/services/check-all", {
      method: "POST",
    });
  }

  // Traffic
  async getTrafficSummary() {
    return this.request("/traffic/summary");
  }

  async getTrafficHistory(id, limit = 100) {
    return this.request(`/traffic/${id}/history?limit=${limit}`);
  }

  async getCurrentTraffic(id) {
    return this.request(`/traffic/${id}/current`);
  }

  async updateTraffic(data) {
    return this.request("/traffic/update", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Health
  async getHealth() {
    return this.request("/health");
  }

  // Generic HTTP methods for flexibility
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: "GET" });
  }

  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: "DELETE" });
  }
}

export const api = new APIClient();
