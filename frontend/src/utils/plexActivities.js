export const getPlexActivityCategory = (activity) => {
  const type = (activity.type || "").toLowerCase();
  const description = `${activity.title || ""} ${activity.subtitle || ""}`.toLowerCase();

  if (["stream", "transcode", "pause", "download", "media.download"].includes(type)) {
    return "stream";
  }

  if (
    type.includes("butler") ||
    type.includes("subscription") ||
    type === "media.generate"
  ) {
    return "background";
  }

  if (type.includes("scan") || type === "library.update.section") {
    return "scan";
  }

  if (/\b(butler|subscriptions?|processing)\b/.test(description)) {
    return "background";
  }

  if (/\b(scanning|scan)\b/.test(description)) {
    return "scan";
  }

  return "stream";
};
