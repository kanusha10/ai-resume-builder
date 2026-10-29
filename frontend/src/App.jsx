import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ResumeEditor from "./pages/ResumeEditor";
import UploadResume from "./pages/UploadResume";
import NotFound from "./pages/NotFound";
import ForgotPassword from './pages/ForgotPassword';

import { AuthProvider, useAuth } from "./context/AuthContext";

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: window.location.pathname }}
      />
    );
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/resume/new"
        element={
          <ProtectedRoute>
            <ResumeEditor />
          </ProtectedRoute>
        }
      />

      <Route
        path="/resume/:id"
        element={
          <ProtectedRoute>
            <ResumeEditor />
          </ProtectedRoute>
        }
      />

      <Route
        path="/resume/upload"
        element={
          <ProtectedRoute>
            <UploadResume />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;