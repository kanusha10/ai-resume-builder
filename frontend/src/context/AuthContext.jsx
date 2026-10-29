import { createContext, useContext, useEffect, useState } from "react";
import {
  loginUser,
  requestRegistrationOtp,
  verifyRegistrationOtp,
} from "../utils/authApi";
import { getToken, removeToken, setToken } from "../utils/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setAuthToken] = useState(getToken());
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const login = async (credentials) => {
    setLoading(true);

    try {
      const response = await loginUser(credentials);

      // Spring Boot returns accessToken or token
      const receivedToken =
        response.token ||
        response.accessToken ||
        response.jwt;

      if (!receivedToken) {
        throw new Error("Login succeeded but no token was returned by the server.");
      }

      // Sets under resumeCraftToken and token
      setToken(receivedToken);
      setAuthToken(receivedToken);

      const userData = response.user || {
        name: response.name || credentials.name || localStorage.getItem("userName") || "",
        email: response.email || credentials.email || "",
      };

      if (userData.name) {
        localStorage.setItem("userName", userData.name);
      }
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);

      return response;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);

    try {
      return await requestRegistrationOtp(userData);
    } finally {
      setLoading(false);
    }
  };

  const verifyRegistration = async (data) => {
    setLoading(true);

    try {
      const response = await verifyRegistrationOtp(data);

      const receivedToken =
        response.token || response.accessToken || response.jwt;

      if (!receivedToken) {
        throw new Error("OTP verified, but no token was returned.");
      }

      setToken(receivedToken);
      setAuthToken(receivedToken);

      const userData = {
        id: response.id,
        name: response.name || "",
        email: response.email || data.email,
      };

      localStorage.setItem("user", JSON.stringify(userData));

      if (userData.name) {
        localStorage.setItem("userName", userData.name);
      }

      setUser(userData);

      return response;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    removeToken();
    setAuthToken(null);
    setUser(null);
  };

  useEffect(() => {
    const currentToken = getToken();
    setAuthToken(currentToken);
    try {
      const stored = localStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    } catch {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        isAuthenticated: Boolean(token),
        login,
        register,
        verifyRegistration,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}