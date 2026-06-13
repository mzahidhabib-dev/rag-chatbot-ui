import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  userId: string;
  tenantId: string;
  tenantName: string;
  email: string;
  role?: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('rag_jwt'));
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (token) {
      try {
        const payloadBase64 = token.split('.')[1];
        const payloadJson = atob(payloadBase64);
        const payload = JSON.parse(payloadJson);
        setUser({
          userId: payload.sub || payload.userId,
          tenantId: payload.tenantId,
          tenantName: payload.tenantName || 'Workspace',
          email: payload.email,
        });
        localStorage.setItem('rag_jwt', token);
      } catch (e) {
        console.error('Failed to parse JWT', e);
        logout();
      }
    } else {
      setUser(null);
      localStorage.removeItem('rag_jwt');
    }
  }, [token]);

  const login = (newToken: string) => {
    setToken(newToken);
  };

  const logout = () => {
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
