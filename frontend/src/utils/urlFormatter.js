export function formatUrl(url) {
  if (!url) return "";
  let trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

export function getCleanDomain(url) {
  if (!url) return "";
  try {
    const parsed = new URL(formatUrl(url));
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}