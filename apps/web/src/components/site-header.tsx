'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/', label: '首页' },
  { href: '/projects', label: '我的项目' },
  { href: '/lab', label: '实验室' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <header className="relative z-10 flex items-center justify-between px-6 py-4 md:px-10">
      <div className="flex items-center gap-8">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">
          AmosMind <span className="text-sm font-normal text-zinc-400">Beta 0.1</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-zinc-400 md:flex">
          {nav.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'transition-colors hover:text-white',
                pathname === item.href && 'text-white',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3 text-sm tabular-nums">
        <span className="rounded-full bg-zinc-800/80 px-3 py-1 text-zinc-300">
          {user ? user.creditBalance.toLocaleString() : '—'}
        </span>
        <div className="size-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500" />
      </div>
    </header>
  );
}
