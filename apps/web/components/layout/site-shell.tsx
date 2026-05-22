'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { LayoutGrid, Radio, Swords, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, type UserProfile } from '@/lib/api';

const nav = [
  { href: '/play', label: 'Play', icon: Swords },
  { href: '/broadcast', label: 'Broadcast', icon: Radio },
];

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ user: UserProfile | null }>('/auth/me'),
    retry: false,
  });
  const user = data?.user;

  const hideChrome = pathname.startsWith('/game/');

  if (hideChrome) {
    return (
      <div className="min-h-screen bg-background">
        <header className="flex h-10 items-center border-b border-white/5 px-4">
          <Link href="/play" className="text-sm font-bold text-brand">
            WordsArena
          </Link>
        </header>
        {children}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 flex h-screen w-14 shrink-0 flex-col overflow-y-auto border-r border-white/5 bg-surface md:w-52">
        <Link
          href="/play"
          className="flex h-12 shrink-0 items-center justify-center border-b border-white/5 px-3 md:justify-start md:gap-2"
        >
          <LayoutGrid className="h-5 w-5 text-brand md:hidden" />
          <span className="hidden font-bold text-ink md:inline">WordsArena</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded px-2 py-2 text-sm font-medium transition-colors',
                  active ? 'bg-brand-soft text-brand-bright' : 'text-muted hover:bg-surface-2 hover:text-ink',
                )}
              >
                <Icon className="mx-auto h-4 w-4 shrink-0 md:mx-0" />
                <span className="hidden md:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="shrink-0 border-t border-white/5 p-2">
          {user ? (
            <Link
              href={`/u/${user.username}`}
              className="flex items-center gap-2 rounded px-2 py-2 text-sm hover:bg-surface-2"
            >
              <User className="h-4 w-4 shrink-0 text-muted md:hidden" />
              <span className="hidden truncate text-ink md:inline">{user.username}</span>
              <span className="truncate text-ink md:hidden">Profile</span>
            </Link>
          ) : (
            <Link href="/login" className="block rounded px-2 py-2 text-center text-sm text-brand hover:bg-surface-2 md:text-left">
              Sign in
            </Link>
          )}
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
