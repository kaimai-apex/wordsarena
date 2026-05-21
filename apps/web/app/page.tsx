import Link from 'next/link';
import { Sparkles, Swords, Sun, Waves, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const modes = [
  {
    href: '/play/daily',
    title: 'Daily',
    desc: 'One puzzle worldwide. Same board, same seed, every day.',
    icon: Sun,
    color: 'from-papaya to-coral',
  },
  {
    href: '/play/zen',
    title: 'Zen',
    desc: 'No timer. Pure vibes. Find words at your own pace.',
    icon: Waves,
    color: 'from-teal to-lagoon',
  },
  {
    href: '/play/blitz',
    title: 'Blitz Solo',
    desc: '60 seconds. Max score. Go go go.',
    icon: Zap,
    color: 'from-mango to-papaya',
  },
  {
    href: '/lobby',
    title: 'Versus',
    desc: 'Head-to-head on a shared board. Claim words before they do.',
    icon: Swords,
    color: 'from-gem to-coral',
  },
];

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      {/* Floating blobs */}
      <div className="pointer-events-none absolute -left-32 top-20 h-64 w-64 rounded-full bg-coral/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-40 h-72 w-72 rounded-full bg-teal/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-20 left-1/3 h-48 w-48 rounded-full bg-mango/25 blur-3xl" />

      <section className="mx-auto max-w-6xl px-4 py-16 text-center md:py-24">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/60 px-4 py-2 text-sm font-semibold text-teal shadow-sm">
          <Sparkles className="h-4 w-4" />
          Free · No ads · Play instantly
        </div>

        <h1 className="mb-6 text-5xl font-extrabold tracking-tight md:text-7xl">
          <span className="text-ink">Words</span>
          <span className="text-coral">Arena</span>
          <br />
          <span className="text-2xl font-bold text-ink-soft md:text-3xl">word puzzles with tropical heat 🔥</span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg text-ink-soft md:text-xl">
          Place letter tiles, claim words, stack combos. Solo daily challenges or
          real-time rated battles — all in your browser.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/play">
            <Button size="lg">Play now</Button>
          </Link>
          <Link href="/lobby">
            <Button variant="ocean" size="lg">Find a match</Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-24 md:grid-cols-2 lg:grid-cols-4">
        {modes.map(({ href, title, desc, icon: Icon, color }) => (
          <Link key={href} href={href}>
            <Card className="group h-full bouncy-hover cursor-pointer overflow-hidden p-0">
              <div className={`bg-gradient-to-br ${color} p-5 text-white`}>
                <Icon className="mb-2 h-8 w-8 transition-transform group-hover:scale-110" />
                <h2 className="text-xl font-bold">{title}</h2>
              </div>
              <p className="p-5 text-sm text-ink-soft">{desc}</p>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
