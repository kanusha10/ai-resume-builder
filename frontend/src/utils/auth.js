/**
 * Utility functions for retrieving and managing authentication tokens.
 */
export function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt_token") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("jwt") ||
    ""
  );
}

export function setToken(token) {
  if (token) {
    localStorage.setItem("token", token);
  }
}

export function removeToken() {
  localStorage.removeItem("token");
  localStorage.removeItem("jwt");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("jwt_token");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("jwt");
}

export function isAuthenticated() {
  return Boolean(getToken());
}