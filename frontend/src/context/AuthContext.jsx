import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [demoUsers, setDemoUsers] = useState([]);

  const checkAuth = async () => {
    try {
      // Ensure CSRF cookie exists
      await api.getCsrf().catch(() => {});
      const data = await api.getMe();
      if (data.authenticated) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchDemoUsers = async () => {
    try {
      const data = await api.getDemoUsers();
      if (data.users) {
        setDemoUsers(data.users);
      }
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    checkAuth();
    fetchDemoUsers();
  }, []);

  const login = async (username, password) => {
    const res = await api.login({ username, password });
    if (res.success && res.user) {
      setUser(res.user);
      return res.user;
    }
  };

  const register = async (formData) => {
    const res = await api.register(formData);
    if (res.success && res.user) {
      setUser(res.user);
      return res.user;
    }
    return res;
  };

  const forgotPassword = async (data) => {
    return await api.forgotPassword(data);
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  };

  const hasRole = (...roles) => {
    if (!user) return false;
    if (user.is_superuser || (user.roles && user.roles.includes('Super Admin'))) return true;
    if (!user.roles) return false;
    return roles.some((r) => user.roles.includes(r));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        demoUsers,
        login,
        register,
        forgotPassword,
        logout,
        hasRole,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
