'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getMe, login as apiLogin, type UserMe } from '@/lib/api';

interface AuthContextValue {
  user: UserMe | null;
  loading: boolean;
  authError: string | null;
  /** 开发环境为 true 时自动 dev 登录；生产环境为 false */
  devAutoLogin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  /** 提交任务前确保已登录（开发环境自动 dev 账号） */
  ensureAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEV_EMAIL = 'dev@amosmind.local';
const DEV_PASSWORD = 'dev123456';

/** 仅开发环境自动登录；生产/VPS 预发布需手动登录 */
const DEV_AUTO_LOGIN =
  process.env.NODE_ENV !== 'production' &&
  process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN !== 'false';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem('amos_token');
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const me = await getMe();
      setUser(me);
    } catch {
      localStorage.removeItem('amos_token');
      setUser(null);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    localStorage.setItem('amos_token', res.accessToken);
    setUser(res.user);
    setAuthError(null);
  }, []);

  const ensureAuth = useCallback(async () => {
    if (user && localStorage.getItem('amos_token')) return;
    await refresh();
    if (localStorage.getItem('amos_token')) return;
    if (DEV_AUTO_LOGIN) {
      await login(DEV_EMAIL, DEV_PASSWORD);
      return;
    }
    throw new Error('请先登录后再提交任务');
  }, [user, refresh, login]);

  const logout = useCallback(() => {
    localStorage.removeItem('amos_token');
    setUser(null);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setAuthError(null);
        await refresh();
        if (!localStorage.getItem('amos_token') && DEV_AUTO_LOGIN) {
          await login(DEV_EMAIL, DEV_PASSWORD);
        }
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : DEV_AUTO_LOGIN
              ? '自动登录失败，请确认 API(3001) 与数据库已启动后刷新页面'
              : '无法连接 API，请稍后重试';
        setAuthError(msg);
        console.error('[Auth]', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [login, refresh]);

  const value = useMemo(
    () => ({
      user,
      loading,
      authError,
      devAutoLogin: DEV_AUTO_LOGIN,
      login,
      logout,
      refresh,
      ensureAuth,
    }),
    [user, loading, authError, login, logout, refresh, ensureAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
