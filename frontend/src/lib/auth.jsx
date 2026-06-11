import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiClient, getToken, setToken, formatApiError } from "@/lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const { data } = await apiClient.get("/auth/me");
      setUser(data);
      return data;
    } catch (e) {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signup = async (username, password) => {
    const { data } = await apiClient.post("/auth/signup", { username, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const login = async (username, password) => {
    const { data } = await apiClient.post("/auth/login", { username, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const markLevelComplete = async (level) => {
    const { data } = await apiClient.post("/progress/complete-level", { level });
    setUser((u) => (u ? { ...u, completed_levels: data.completed_levels } : u));
    return data.completed_levels;
  };

  return (
    <AuthCtx.Provider value={{ user, loading, signup, login, logout, refresh, markLevelComplete }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}

export { formatApiError };
