const API_BASE_URL = "/api/plex";

/**
 * Plex Service
 * Handles all Plex-related API calls
 */

/**
 * Test Plex server connection and validate credentials
 * @param {string} plexUrl - Plex server URL
 * @param {string} plexToken - Plex authentication token
 * @returns {Promise<Object>} Validation result
 */
export const testPlexConnection = async (plexUrl, plexToken) => {
  try {
    console.log("Testing Plex connection...", { url: plexUrl });

    const response = await fetch(`${API_BASE_URL}/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: plexUrl,
        token: plexToken,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to validate Plex connection");
    }

    if (!data.valid) {
      throw new Error(data.message || "Invalid Plex credentials");
    }

    console.log("Plex connection successful", {
      serverName: data.server_name,
    });

    return data;
  } catch (error) {
    console.error("Plex connection failed", error);

    if (error.response?.status === 401) {
      throw new Error("Invalid Plex token");
    }

    if (error.code === "ECONNREFUSED") {
      throw new Error(
        "Unable to connect to Plex server. Please check if the server is running."
      );
    }

    throw new Error(
      error.message ||
        "Failed to connect to Plex server. Please check your server URL and token."
    );
  }
};

/**
 * Get current Plex configuration
 * @returns {Promise<Object>} Plex configuration
 */
export const getPlexConfig = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/config`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch Plex configuration");
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch Plex config", error);
    throw error;
  }
};

/**
 * Save Plex configuration
 * @param {string} plexUrl - Plex server URL
 * @param {string} plexToken - Plex authentication token
 * @returns {Promise<Object>} Save result
 */
export const savePlexConfig = async (plexUrl, plexToken) => {
  try {
    const response = await fetch(`${API_BASE_URL}/config`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: plexUrl,
        token: plexToken,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.detail || "Failed to save Plex configuration");
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to save Plex config", error);
    throw error;
  }
};

/**
 * Fetch Plex activities (downloads, streams, transcodes)
 * @returns {Promise<Array>} Array of activities
 */
export const fetchPlexActivities = async () => {
  try {
    const response = await fetch("/api/downloads", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch Plex activities");
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.message || "Failed to fetch Plex activities");
    }

    const activities = data.activities || [];

    console.log("Fetched Plex activities", {
      count: activities.length,
    });

    // Process and normalize activities
    return activities.map((activity) => ({
      uuid: activity.uuid || `id-${Math.random().toString(36).substr(2, 9)}`,
      type: activity.type || "download",
      title: activity.title || "Unknown",
      subtitle: activity.subtitle || "Unknown",
      progress:
        typeof activity.progress === "number"
          ? Math.min(activity.progress, 100)
          : 0,
      raw_data: activity.raw_data || activity,
    }));
  } catch (error) {
    console.error("Failed to fetch Plex activities", error);
    throw new Error(error.message || "Failed to fetch Plex activities");
  }
};

/**
 * Get Plex server identity/info
 * @returns {Promise<Object>} Server information
 */
export const getPlexIdentity = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/identity`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch Plex server identity");
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch Plex identity", error);
    throw error;
  }
};
