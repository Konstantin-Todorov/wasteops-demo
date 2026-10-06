import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Повреден или чужд запис в localStorage не бива да събаря приложението —
    // JSON.parse('undefined') хвърля и целият React tree пада на бял екран.
    try {
      const stored = localStorage.getItem('wo_user');
      if (!stored || stored === 'undefined' || stored === 'null') return null;
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem('wo_user');
      localStorage.removeItem('wo_token');
      return null;
    }
  });
  const [token, setToken] = useState(() => {
    const t = localStorage.getItem('wo_token');
    return t && t !== 'undefined' ? t : null;
  });

  async function login(email, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Грешка при вход');
    if (!data.token || !data.user) throw new Error('Сървърът върна непълен отговор');
    localStorage.setItem('wo_token', data.token);
    localStorage.setItem('wo_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem('wo_token');
    localStorage.removeItem('wo_user');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
