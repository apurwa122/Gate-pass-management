import React, { createContext, useContext, useState } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('gatepass_user'));
    } catch {
      return null;
    }
  });
  const login = async (email, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } });
    localStorage.setItem('gatepass_token', data.token);
    localStorage.setItem('gatepass_user', JSON.stringify(data.user));
    setUser(data.user);
  };
  const logout = () => {
    localStorage.removeItem('gatepass_token');
    localStorage.removeItem('gatepass_user');
    setUser(null);
  };
  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}
