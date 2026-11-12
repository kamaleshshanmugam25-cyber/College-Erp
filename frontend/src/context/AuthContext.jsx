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

  const ROLE_CREDENTIALS = {
    'Super Admin': { username: 'SuperAdmin', password: 'password123' },
    'Finance Admin': { username: 'finance', password: 'password123' },
    'Finance User': { username: 'financeuser', password: 'password123' },
    'Accountant': { username: 'accountant', password: 'password123' },
    'HR Admin': { username: 'HrAdmin', password: 'password123' },
    'Employee': { username: 'empl', password: 'password123' },
    'Employee / Faculty': { username: 'empl', password: 'password123' },
    'Student/Parent': { username: 'student', password: 'password123' },
    'Student / Parent': { username: 'student', password: 'password123' },
  };

  const switchRole = async (roleName) => {
    const creds = ROLE_CREDENTIALS[roleName];
    if (creds) {
      try {
        const res = await api.login(creds);
        if (res?.success && res.user) {
          setUser(res.user);
          return res.user;
        }
      } catch (err) {
        console.warn('Role switch with credentials failed:', err);
      }
    }
    try {
      const res = await api.login({ demo_role: roleName });
      if (res?.success && res.user) {
        setUser(res.user);
        return res.user;
      }
    } catch {
      // fallback
    }
    return null;
  };

  const hasRole = (...roles) => {
    if (!user) return false;
    if (user.is_superuser || (user.roles && user.roles.includes('Super Admin'))) return true;
    if (!user.roles) return false;
    return roles.some((r) => user.roles.includes(r));
  };

  const canAccessModule = (moduleId) => {
    if (!user) return false;
    if (user.is_superuser || (user.roles && user.roles.includes('Super Admin'))) return true;
    if (user.accessible_modules && Array.isArray(user.accessible_modules)) {
      return user.accessible_modules.includes(moduleId);
    }
    return true;
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
        switchRole,
        hasRole,
        canAccessModule,
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
