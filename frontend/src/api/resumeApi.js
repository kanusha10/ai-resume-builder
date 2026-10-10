import { getToken } from '../utils/auth';

const API_BASE = '/api/resumes';

function getAuthHeaders(includeContentType = true) {
  const token = localStorage.getItem('token') || getToken();

  const headers = {};

  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  }

  return headers;
}

async function request(url, options = {}) {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // DELETE may return 204 No Content.
  if (response.status === 204 || response.status === 205) {
    return null;
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));

    throw new Error(
      errorBody.message ||
      errorBody.error ||
      `Request failed with status ${response.status}`
    );
  }

  // Safely handle an empty response body.
  const contentLength = response.headers.get('content-length');

  if (contentLength === '0') {
    return null;
  }

  return response.json();
}

// Get all resumes.
export async function getResumes() {
  return request(API_BASE);
}

// Get one resume by ID.
export async function getResume(id) {
  return request(`${API_BASE}/${id}`);
}

// Create a resume.
export async function createResume(data) {
  return request(API_BASE, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Update a resume.
export async function updateResume(id, data) {
  return request(`${API_BASE}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// Delete a resume.
export async function deleteResume(id) {
  return request(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });
}

// Download a resume as a file.
export async function downloadResume(id, filename = 'resume.pdf') {
  const response = await fetch(`${API_BASE}/${id}/download`, {
    method: 'GET',
    headers: getAuthHeaders(false),
  });

  if (!response.ok) {
    // Preserve the existing fallback behavior.
    return getResume(id);
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = downloadUrl;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(downloadUrl);
}