import type { Metadata } from 'next';
import { AuthProvider } from '@/context/auth-context';
import { AuthGate } from '@/components/auth-gate';
import { SiteHeader } from '@/components/site-header';
import { BackgroundGlow } from '@/components/background-glow';
import './globals.css';

export const metadata: Metadata = {
  title: 'AmosMind — 你的设计提效伙伴',
  description: 'AIGC 设计提效学习项目',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-dvh">
        <AuthProvider>
          <BackgroundGlow />
          <SiteHeader />
          <main className="relative z-10">
            <AuthGate>{children}</AuthGate>
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
