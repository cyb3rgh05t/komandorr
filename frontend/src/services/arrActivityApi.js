// API service for Sonarr/Radarr activity monitoring
const DEFAULT_BASE_URL = "/api/arr-activity";

const baseUrl =
  (typeof import.meta !== "undefined" &&
    import.meta.env?.VITE_ARR_ACTIVITY_BASE_URL) ||
  DEFAULT_BASE_URL;

async function fetchJson(path, options = {}) {
  const url = `${baseUrl}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `*arr Activity API ${response.status}: ${text || "request failed"}`
    );
  }

  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch (err) {
    throw new Error(`*arr Activity API invalid JSON for ${path}`);
  }
}

export const arrActivityApi = {
  baseUrl,

  /**
   * Get combined download queue from Sonarr and Radarr
   * @param {AbortSignal} signal - Optional abort signal
   * @returns {Promise} Combined queue data
   */
  getQueue: (signal) => fetchJson("/queue", { signal }),

  /**
   * Get queue status summary
   * @param {AbortSignal} signal - Optional abort signal
   * @returns {Promise} Queue status data
   */
  getQueueStatus: (signal) => fetchJson("/queue/status", { signal }),

  /**
   * Get recent history from Sonarr and Radarr
   * @param {number} page - Page number (default 1)
   * @param {number} pageSize - Items per page (default 50)
   * @param {AbortSignal} signal - Optional abort signal
   * @returns {Promise} History data
   */
  getHistory: (page = 1, pageSize = 50, signal) =>
    fetchJson(`/history?page=${page}&page_size=${pageSize}`, { signal }),

  /**
   * Get system status from Sonarr and Radarr
   * @param {AbortSignal} signal - Optional abort signal
   * @returns {Promise} System status data
   */
  getSystemStatus: (signal) => fetchJson("/system/status", { signal }),
};
