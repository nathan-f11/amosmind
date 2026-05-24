'use client';

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

/**
 * 预发布/生产环境登录面板（开发环境自动登录时不显示）
 * @author Cursor AI
 */
export function LoginPanel() {
  const { login, authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col justify-center px-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 backdrop-blur">
        <h1 className="text-balance text-xl font-semibold text-white">登录 AmosMind</h1>
        <p className="mt-2 text-pretty text-sm text-zinc-400">
          预发布环境需使用 seed 账号登录，请勿使用默认 dev 密码。
        </p>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            邮箱
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={cn(
                'rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2',
                'text-white placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none',
              )}
              placeholder="dev@amosmind.local"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            密码
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className={cn(
                'rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2',
                'text-white placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none',
              )}
            />
          </label>
          {(error || authError) && (
            <p className="text-sm text-red-400">{error || authError}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className={cn(
              'rounded-lg bg-violet-600 px-4 py-2.5 font-medium text-white',
              'hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {submitting ? '登录中…' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
}
