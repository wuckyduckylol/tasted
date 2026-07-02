import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { isSupabaseConfigured } from '../lib/config';
import { getSupabase } from '../lib/supabase';

interface SessionState {
  session: Session | null;
  isLoading: boolean;
}

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    session: null,
    isLoading: isSupabaseConfigured,
  });

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabase();
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setState({ session: data.session, isLoading: false });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setState({ session, isLoading: false });
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
