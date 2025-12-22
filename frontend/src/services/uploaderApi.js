const DEFAULT_BASE_URL = "http://uploader:8080";

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
  getQueue: (signal) => fetchJson("/srv/api/jobs/queue.php", { signal }),
  getInProgress: (signal) =>
    fetchJson("/srv/api/jobs/inprogress.php", { signal }),
  getCompleted: (pageNumber = 1, pageSize = 25, signal) =>
    fetchJson(
      `/srv/api/jobs/completed.php?pageNumber=${pageNumber}&pageSize=${pageSize}`,
      {
        signal,
      }
    ),
  getQueueStats: (signal) =>
    fetchJson("/srv/api/jobs/queue_stats.php", { signal }),
  getCompletedTodayStats: (signal) =>
    fetchJson("/srv/api/jobs/completed_today_stats.php", { signal }),
  getStatus: (signal) => fetchJson("/srv/api/system/status.php", { signal }),
};
