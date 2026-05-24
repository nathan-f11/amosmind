'use client';

import { cn } from '@/lib/utils';

interface TaskProgressProps {
  status: string;
  error?: string | null;
}

export function TaskProgress({ status, error }: TaskProgressProps) {
  if (status === 'succeeded' || status === 'failed') return null;

  return (
    <div className="mt-4 rounded-xl border border-zinc-700/50 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-300">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-block size-2 animate-pulse rounded-full',
            status === 'running' ? 'bg-violet-400' : 'bg-amber-400',
          )}
        />
        {status === 'pending' && '排队中…'}
        {status === 'running' && '生成中…'}
      </div>
      {error && <p className="mt-2 text-red-400">{error}</p>}
    </div>
  );
}
