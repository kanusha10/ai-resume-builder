import { getToken } from "../utils/auth";

const API_BASE = "/api/ats";

function authHeaders() {
  const token = localStorage.getItem("token") || getToken();
  const headers = { "Content-Type": "application/json" };

  if (token) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }

  return headers;
}

export class AtsApiError extends Error {
  constructor(message, status = 0, retryAfter = 0) {
    super(message);
    this.name = "AtsApiError";
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

export async function analyzeAts(
  { resume, jobTitle = "", jobDescription = "", resumeId = null, contentSignature = "" },
  { signal } = {}
) {
  // eslint-disable-next-line no-unused-vars
  const { photo, ...resumeWithoutPhoto } = resume || {};

  let response;
  try {
    response = await fetch(`${API_BASE}/analyze`, {
      method: "POST",
      headers: authHeaders(),
      signal,
      body: JSON.stringify({
        resume: resumeWithoutPhoto,
        jobTitle: jobTitle.trim(),
        jobDescription: jobDescription.trim(),
        resumeId: resumeId ? Number(resumeId) : null,
        contentSignature,
      }),
    });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new AtsApiError("Could not reach the server. Check your connection and try again.");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const retryAfter = Number(response.headers.get("Retry-After")) || 0;

    if (response.status === 401 || response.status === 403) {
      throw new AtsApiError("Your session has expired. Please log in again.", response.status);
    }

    throw new AtsApiError(
      body.message || "The ATS analysis could not be completed. Please try again.",
      response.status,
      retryAfter
    );
  }

  return response.json();
}

export async function getAtsStatus() {
  const response = await fetch(`${API_BASE}/status`, { headers: authHeaders() });

  if (!response.ok) {
    throw new AtsApiError("Could not read the ATS service status.", response.status);
  }

  return response.json();
}

export async function getLatestAnalysis(resumeId) {
  const response = await fetch(`${API_BASE}/resumes/${resumeId}/latest`, { headers: authHeaders() });

  if (response.status === 204 || response.status === 404) return null;

  if (!response.ok) {
    throw new AtsApiError("Could not load the saved ATS analysis.", response.status);
  }

  const saved = await response.json();

  try {
    return {
      result: JSON.parse(saved.resultJson),
      signature: saved.contentSignature || "",
      analyzedAt: saved.analyzedAt,
      jobTitle: saved.jobTitle || "",
      jobDescription: saved.jobDescription || "",
    };
  } catch {
    return null;
  }
}