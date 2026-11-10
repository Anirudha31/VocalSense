import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { authApi } from "../lib/api";

const C = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check existing authentication when the app starts
  useEffect(() => {
    const token = localStorage.getItem("vocalsense_token");

    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    authApi
      .me()
      .then((r) => {
        if (!cancelled) {
          setUser(r.data);
        }
      })
      .catch(() => {
        localStorage.removeItem("vocalsense_token");

        if (!cancelled) {
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Login
  const login = async (email, password) => {
    const r = await authApi.login({ email, password });

    localStorage.setItem(
      "vocalsense_token",
      r.data.access_token
    );

    setUser(r.data.user);
  };

  // Register
  const register = async (name, email, password) => {
    const r = await authApi.register({
      name,
      email,
      password,
    });

    localStorage.setItem(
      "vocalsense_token",
      r.data.access_token
    );

    setUser(r.data.user);
  };

  // Logout
  const logout = () => {
    localStorage.removeItem("vocalsense_token");
    setUser(null);
  };

  return (
    <C.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </C.Provider>
  );
}

// Custom authentication hook
export const useAuth = () => {
  const context = useContext(C);

  if (!context) {
    throw new Error(
      "useAuth must be used inside an AuthProvider"
    );
  }

  return context;
};