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
        throw new Error(`HTTP error! status: ${response.status}`);
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

  // Health
  async getHealth() {
    return this.request("/health");
  }
}

export const api = new APIClient();
