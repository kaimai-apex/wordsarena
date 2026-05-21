'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';

export default function LoginPage() {
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api('/auth/request-magic-link', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch (err) {
      setError(String(err));
    }
  }

  async function verifyToken(token: string) {
    try {
      await api('/auth/verify-magic-link', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      window.location.href = '/';
    } catch (err) {
      setError(String(err));
    }
  }

  const token = params.get('token');
  if (token && !error) {
    void verifyToken(token);
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center px-4 py-12">
      <Card className="w-full">
        <h1 className="mb-4 text-2xl font-bold text-ink">Sign in</h1>
        {sent ? (
          <p className="text-ink-soft">Check your email for a magic link. (In dev, check the API console.)</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-bubble border-2 border-teal/20 bg-white/80 px-4 py-3 outline-none focus:border-teal"
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" className="w-full">Send magic link</Button>
          </form>
        )}
      </Card>
    </div>
  );
}
