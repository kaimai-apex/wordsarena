import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { SiteShell } from '@/components/layout/site-shell';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  weight: ['500', '600'],
});

export const metadata: Metadata = {
  title: 'WordsArena — Free word games online',
  description:
    'Free online word games — rated and casual multiplayer with Glicko-2 ratings.',
  openGraph: {
    title: 'WordsArena',
    description: 'Free online word games — rated multiplayer on a shared board.',
    type: 'website',
  },
};

export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <head>
        <link rel="preload" href="/dictionary.dict" as="fetch" crossOrigin="anonymous" />
      </head>
      <body className="font-sans">
        <Providers>
          <SiteShell>{children}</SiteShell>
        </Providers>
      </body>
    </html>
  );
}
