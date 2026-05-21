'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { isSupabaseReady } from '@/lib/env';

export default function LoginPage() {
  const params = useSearchParams();
  const [error, setError] = useState('');
  const supabaseReady = isSupabaseReady();

  useEffect(() => {
    if (params.get('error') === 'auth') {
      setError('Google sign-in failed. Try again.');
    }
  }, [params]);

  async function handleGoogleSignIn() {
    setError('');
    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/lobby`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (oauthError) setError(oauthError.message);
    } catch (err) {
      setError(String(err));
    }
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center px-4 py-12">
      <Card className="w-full space-y-6">
        <div>
          <h1 className="mb-2 text-2xl font-bold text-ink">Sign in</h1>
          <p className="text-sm text-ink-soft">
            Sign in with Google to create your account and play rated multiplayer.
          </p>
        </div>

        {supabaseReady ? (
          <Button type="button" onClick={handleGoogleSignIn} className="w-full">
            Sign in with Google
          </Button>
        ) : (
          <p className="text-sm text-danger">
            Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to the repo root .env, then restart pnpm dev.
          </p>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}
      </Card>
    </div>
  );
}
