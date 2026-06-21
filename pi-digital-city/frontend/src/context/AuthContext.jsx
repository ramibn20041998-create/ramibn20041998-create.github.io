import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authenticateWithPi, isPiBrowser } from '../lib/piSdk';
import { api, getToken, setToken } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      return null;
    }
    try {
      const { user } = await api.me();
      setUser(user);
      return user;
    } catch (e) {
      setToken(null);
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const handleIncompletePayment = useCallback(async (payment) => {
    try {
      await api.resolveIncomplete(payment.identifier);
    } catch {
      // best-effort - surfaced again next login if still unresolved
    }
  }, []);

  const login = useCallback(async () => {
    setError(null);
    if (!isPiBrowser()) {
      setError('Pi Digital City must be opened inside Pi Browser to sign in.');
      return false;
    }
    setLoading(true);
    try {
      const { accessToken } = await authenticateWithPi(handleIncompletePayment);
      const { token, user } = await api.login(accessToken);
      setToken(token);
      setUser(user);
      return true;
    } catch (e) {
      setError(e.message || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, [handleIncompletePayment]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
