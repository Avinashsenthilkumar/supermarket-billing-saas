import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);
const SUPER_ADMIN_EMAIL = 'admin@supermarket.com';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [shop, setShop] = useState(() => {
    try { return JSON.parse(localStorage.getItem('shop')); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));

  const persist = (t, u, s) => {
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
    if (s) localStorage.setItem('shop', JSON.stringify(s));
    setToken(t);
    setUser(u);
    if (s) setShop(s);
  };

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { token: t, user: u, shop: s } = res.data.data;
    persist(t, u, s);
    return u;
  }, []);

  const register = useCallback(async (payload) => {
    const res = await authAPI.register(payload);
    const { token: t, user: u, shop: s } = res.data.data;
    persist(t, u, s);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('shop');
    setToken(null);
    setUser(null);
    setShop(null);
  }, []);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    authAPI.getMe()
      .then((res) => {
        setUser(res.data.data.user);
        if (res.data.data.shop) {
          setShop(res.data.data.shop);
          localStorage.setItem('shop', JSON.stringify(res.data.data.shop));
        }
      })
      .catch(() => { logout(); })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const isSuperAdmin = !!user && user.email === SUPER_ADMIN_EMAIL;

  return (
    <AuthContext.Provider value={{ user, shop, token, loading, login, register, logout, isSuperAdmin, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
