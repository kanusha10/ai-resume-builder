import { getToken } from '../utils/auth';

const API_BASE = 'http://localhost:8080/api/resumes';

async function request(url, options = {}) {
  // Read token from localStorage directly
  const token = localStorage.getItem('token') || getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  } else {
    console.warn('[resumeApi] No JWT found in localStorage before calling:', url);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export async function getResumes() {
  return request(API_BASE);
}

export async function getResume(id) {
  return request(`${API_BASE}/${id}`);
}

export async function createResume(data) {
  return request(API_BASE, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateResume(id, data) {
  return request(`${API_BASE}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteResume(id) {
  return request(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });
}

export async function downloadResume(id, filename = 'resume.pdf') {
  const token = localStorage.getItem('token') || getToken();
  const headers = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  }

  const response = await fetch(`${API_BASE}/${id}/download`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
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