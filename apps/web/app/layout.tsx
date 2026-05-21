import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Nav } from '@/components/nav';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700', '800'],
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  weight: ['500', '600'],
});

export const metadata: Metadata = {
  title: 'WordsArena — Word puzzles, rated & wild',
  description: 'Free word block puzzles. Daily challenges, zen mode, and head-to-head multiplayer.',
  openGraph: {
    title: 'WordsArena',
    description: 'Tropical word puzzle battles in your browser',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <head>
        <link rel="preload" href="/dictionary.dict" as="fetch" crossOrigin="anonymous" />
      </head>
      <body className="font-sans">
        <Providers>
          <Nav />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
