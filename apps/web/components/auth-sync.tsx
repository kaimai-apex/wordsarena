'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { syncSupabaseSession } from '@/lib/api';
import { isSupabaseReady } from '@/lib/env';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

async function syncIfNeeded(
  queryClient: ReturnType<typeof useQueryClient>,
  accessToken: string,
) {
  const synced = await syncSupabaseSession(accessToken);
  queryClient.setQueryData(['me'], { user: synced.user });
}

/** After Google OAuth, sync Supabase session → app user + cookie for /auth/me. */
export function AuthSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isSupabaseReady()) return;

    const supabase = createSupabaseBrowserClient();

    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        try {
          await syncIfNeeded(queryClient, session.access_token);
        } catch (err) {
          console.error('Auth sync failed:', err);
        }
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.access_token) {
        try {
          await syncIfNeeded(queryClient, session.access_token);
        } catch (err) {
          console.error('Auth sync failed:', err);
        }
      }
      if (event === 'SIGNED_OUT') {
        queryClient.setQueryData(['me'], { user: null });
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  return null;
}
