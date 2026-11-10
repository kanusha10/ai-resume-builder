const VERSION = 1;

const IGNORED_KEYS = new Set([
  "photo",
  "template",
  "color",
  "primaryColor",
  "name",
  "sectionOrder",
  "id",
  "createdAt",
  "updatedAt",
]);

const recordKey = (storageKey) => `ats-analysis:${storageKey || "new"}`;

function isEmpty(value) {
  if (value === undefined || value === null || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

function canonical(value) {
  if (Array.isArray(value)) {
    return value.map(canonical).filter((v) => !isEmpty(v));
  }

  if (value && typeof value === "object") {
    const out = {};
    Object.keys(value)
      .filter((k) => !IGNORED_KEYS.has(k))
      .sort()
      .forEach((k) => {
        const c = canonical(value[k]);
        if (!isEmpty(c)) out[k] = c;
      });
    return out;
  }

  return typeof value === "string" ? value.trim() : value;
}

export function contentSignature(resume) {
  const text = JSON.stringify(canonical(resume || {}));
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  }
  return String(hash);
}

export function loadAnalysis(storageKey) {
  try {
    const raw = localStorage.getItem(recordKey(storageKey));
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data?.v === VERSION && data.result ? data : null;
  } catch {
    return null;
  }
}

export function saveAnalysis(storageKey, { result, signature, analyzedAt, jobTitle, jobDescription }) {
  try {
    localStorage.setItem(
      recordKey(storageKey),
      JSON.stringify({ v: VERSION, result, signature, analyzedAt, jobTitle, jobDescription })
    );
  } catch {
    /* storage full or unavailable: the analysis still works for this session */
  }
}

export function loadSavedScore(storageKey) {
  return loadAnalysis(storageKey)?.result?.score ?? null;
}

