'use client';

import { useAuth } from '@/context/auth-context';
import { LoginPanel } from '@/components/login-panel';

/**
 * 未登录时展示登录页（仅生产/预发布）
 * @author Cursor AI
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, devAutoLogin } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[40dvh] items-center justify-center text-zinc-400">
        加载中…
      </div>
    );
  }

  if (!user && !devAutoLogin) {
    return <LoginPanel />;
  }

  return <>{children}</>;
}
