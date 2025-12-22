// Use backend proxy endpoints to avoid browser DNS/HTTPS/CORS issues
const DEFAULT_BASE_URL = "/api/uploader";

const baseUrl =
  (typeof import.meta !== "undefined" &&
    import.meta.env?.VITE_UPLOADER_BASE_URL) ||
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
      `Uploader API ${response.status}: ${text || "request failed"}`
    );
  }

  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch (err) {
    throw new Error(`Uploader API invalid JSON for ${path}`);
  }
}

export const uploaderApi = {
  baseUrl,
  getQueue: (signal) => fetchJson("/queue", { signal }),
  getInProgress: (signal) => fetchJson("/inprogress", { signal }),
  getCompleted: (pageNumber = 1, pageSize = 25, signal) =>
    fetchJson(`/completed?pageNumber=${pageNumber}&pageSize=${pageSize}`, {
      signal,
    }),
  getQueueStats: (signal) => fetchJson("/queue_stats", { signal }),
  getCompletedTodayStats: (signal) =>
    fetchJson("/completed_today_stats", { signal }),
  getStatus: (signal) => fetchJson("/status", { signal }),
};
