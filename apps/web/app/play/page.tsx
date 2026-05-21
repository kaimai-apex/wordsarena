import Link from 'next/link';
import { Sun, Waves, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';

const modes = [
  { href: '/play/daily', title: 'Daily Puzzle', icon: Sun, emoji: '🌅' },
  { href: '/play/zen', title: 'Zen Mode', icon: Waves, emoji: '🌊' },
  { href: '/play/blitz', title: 'Blitz Solo', icon: Zap, emoji: '⚡' },
];

export default function PlayPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-ink">Pick your vibe</h1>
      <p className="mb-8 text-ink-soft">Solo modes — no account needed to start.</p>
      <div className="grid gap-4">
        {modes.map(({ href, title, emoji }) => (
          <Link key={href} href={href}>
            <Card className="flex items-center gap-4 bouncy-hover cursor-pointer">
              <span className="text-4xl">{emoji}</span>
              <span className="text-xl font-bold">{title}</span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
