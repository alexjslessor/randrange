import React, { createContext, useContext, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LoginForm, User } from '../types';
import { authApi } from '../api/authClient';

interface SessionContextType {
  user: User | null;
  username: string | null;
  roles: string[];
  permissions: string[];
  isSuperuser: boolean;
  loginAction: (form: LoginForm) => Promise<void>;
  logoutAction: () => void;
  isLoggedIn: boolean;
}

const AuthContext = createContext<SessionContextType>({} as SessionContextType);

type JwtPayload = Record<string, unknown>;

const parseJwtPayload = (token: string): JwtPayload | null => {
  if (!token) return null;
  const [, payload] = token.split('.');
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const api = authApi();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState(localStorage.getItem('auth_token') || '');

  const payload = useMemo(() => parseJwtPayload(token), [token]);

  // KC token: groups claim is a list of group names/paths
  const groups = useMemo((): string[] => {
    if (user?.groups?.length) return user.groups;
    const g = payload?.groups;
    return Array.isArray(g) ? (g as string[]) : [];
  }, [payload, user]);

  // KC token: realm_access.roles + resource_access.<client>.roles
  const roles = useMemo((): string[] => {
    if (user?.roles?.length) return user.roles;
    const realmRoles = ((payload?.realm_access as any)?.roles ?? []) as string[];
    return realmRoles;
  }, [payload, user]);

  const permissions = useMemo((): string[] => {
    if (user?.permissions?.length) return user.permissions;
    return roles;
  }, [roles, user]);

  const isSuperuser = useMemo(() => {
    if (typeof user?.is_superuser === 'boolean') return user.is_superuser;
    return roles.includes('superuser') || roles.includes('admin');
  }, [roles, user]);

  const username = useMemo(() => {
    if (user?.username) return user.username;
    const u = payload?.preferred_username;
    return typeof u === 'string' ? u : null;
  }, [payload, user]);

  const isLoggedIn = Boolean(user || token);

  const loginAction = async (form: LoginForm) => {
    const authUser: any = await api.loginUser(form);
    if (!authUser?.access_token) throw new Error('Login did not return an access token');
    queryClient.clear();
    setUser(authUser);
    setToken(authUser.access_token);
    localStorage.setItem('auth_token', authUser.access_token);
    if (authUser.refresh_token) {
      localStorage.setItem('refresh_token', authUser.refresh_token);
    }
  };

  const logoutAction = () => {
    queryClient.clear();
    setUser(null);
    setToken('');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  };

  return (
    <AuthContext.Provider
      value={{ user, username, roles, permissions, isSuperuser, loginAction, logoutAction, isLoggedIn }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);
