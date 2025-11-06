// Cache for timezone from backend
let cachedTimezone = null;

/**
 * Fetch timezone from backend config
 * @returns {Promise<string>} The configured timezone
 */
async function getTimezone() {
  if (cachedTimezone) {
    return cachedTimezone;
  }

  try {
    const response = await fetch("/api/config");
    const data = await response.json();
    cachedTimezone = data.timezone || "UTC";
    return cachedTimezone;
  } catch (error) {
    console.error("Failed to fetch timezone, using UTC:", error);
    cachedTimezone = "UTC";
    return cachedTimezone;
  }
}

export function formatDistanceToNow(date) {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now - past) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}

/**
 * Format datetime in 24-hour format using backend timezone
 * @param {Date|string} date - The date to format
 * @param {boolean} includeSeconds - Whether to include seconds (default: true)
 * @returns {Promise<string>} Formatted datetime string
 */
export async function formatDateTime(date, includeSeconds = true) {
  if (!date) return "N/A";

  const dateObj = date instanceof Date ? date : new Date(date);

  // Check if date is valid
  if (isNaN(dateObj.getTime())) return "Invalid Date";

  const timezone = await getTimezone();

  const options = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    ...(includeSeconds && { second: "2-digit" }),
    hour12: false,
    timeZone: timezone,
  };

  return dateObj.toLocaleString("de-DE", options);
}

/**
 * Format time only in 24-hour format using backend timezone
 * @param {Date|string} date - The date to format
 * @param {boolean} includeSeconds - Whether to include seconds (default: true)
 * @returns {Promise<string>} Formatted time string
 */
export async function formatTime(date, includeSeconds = true) {
  if (!date) return "N/A";

  const dateObj = date instanceof Date ? date : new Date(date);

  // Check if date is valid
  if (isNaN(dateObj.getTime())) return "Invalid Time";

  const timezone = await getTimezone();

  const options = {
    hour: "2-digit",
    minute: "2-digit",
    ...(includeSeconds && { second: "2-digit" }),
    hour12: false,
    timeZone: timezone,
  };

  return dateObj.toLocaleTimeString("de-DE", options);
}
