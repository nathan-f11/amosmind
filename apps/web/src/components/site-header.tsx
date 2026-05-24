'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tag } from 'antd';
import { useAuth } from '@/context/auth-context';
import { UserAvatarTrigger } from '@/components/user-avatar-trigger';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/', label: '首页' },
  { href: '/projects', label: '我的项目' },
  { href: '/credits', label: '积分流水' },
  { href: '/lab', label: '实验室' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const navLinkClass = (href: string, compact?: boolean) =>
    cn(
      'shrink-0 transition-colors',
      compact ? 'rounded-full px-3 py-1.5 text-sm' : 'text-sm hover:text-white',
      pathname === href
        ? compact
          ? 'bg-zinc-800 text-white'
          : 'text-white'
        : compact
          ? 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
          : 'text-zinc-400',
    );

  return (
    <header className="relative z-10 border-b border-zinc-800/50 px-4 md:px-10">
      <div className="flex items-center justify-between py-3 md:py-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-lg font-semibold tracking-tight text-white">
            AmosMind <span className="text-sm font-normal text-zinc-400">Beta 0.1</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {nav.map(item => (
              <Link key={item.href} href={item.href} className={navLinkClass(item.href)}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm tabular-nums">
          <Tag bordered={false} className="!m-0 !rounded-full !px-3 !py-0.5 !text-zinc-300">
            {user ? user.creditBalance.toLocaleString() : '—'}
          </Tag>
          <UserAvatarTrigger user={user} loading={loading} />
        </div>
      </div>
      <nav className="flex gap-2 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden">
        {nav.map(item => (
          <Link key={item.href} href={item.href} className={navLinkClass(item.href, true)}>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
