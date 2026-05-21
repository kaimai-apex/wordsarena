'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Swords, Trophy, User, Waves } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

const links = [
  { href: '/play', label: 'Play', icon: Sparkles },
  { href: '/lobby', label: 'Lobby', icon: Swords },
  { href: '/tournaments', label: 'Arena', icon: Trophy },
  { href: '/leaderboard/daily', label: 'Daily', icon: Waves },
];

export function Nav() {
  const pathname = usePathname();
  const { data } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ user: { username: string } | null }>('/auth/me'),
  });

  return (
    <header className="sticky top-0 z-50 border-b border-white/40 bg-surface/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="group flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-bubble bg-gradient-ocean text-lg shadow-bubble transition-transform group-hover:scale-110">
            🌺
          </span>
          <span className="text-xl font-bold tracking-tight">
            <span className="text-ink">Words</span>
            <span className="text-coral">Arena</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all',
                pathname.startsWith(href)
                  ? 'bg-accent-soft text-accent shadow-sm'
                  : 'text-ink-soft hover:bg-white/60 hover:text-ink',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {data?.user ? (
            <Link href={`/u/${data.user.username}`}>
              <Button variant="ghost" size="sm">
                <User className="mr-1.5 h-4 w-4" />
                {data.user.username}
              </Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button size="sm">Sign in</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
