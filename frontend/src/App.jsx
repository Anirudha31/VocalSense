import { Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider, useAuth } from "./hooks/useAuth";

import Layout from "./components/Layout";

import Login from "./pages/Login";
import Register from "./pages/Register";

import Dashboard from "./pages/Dashboard";
import Detect from "./pages/Detect";
import History from "./pages/History";
import ModelAccuracy from "./pages/ModelAccuracy";

function Protected({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        Loading VocalSense … 
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}

function RoutesApp() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes */}
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/detect" element={<Detect />} />
        <Route path="/history" element={<History />} />
        <Route path="/models" element={<ModelAccuracy />} />
      </Route>

      {/* Fallback route */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RoutesApp />
    </AuthProvider>
  );
}