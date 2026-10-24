// Who is looking: signed out, Free or Pro. Never throws; Supabase may be unconfigured.
import { getProfile, getSession, supabase } from '../../lib/supabase';

export type ProState = { configured: boolean; loggedIn: boolean; isPro: boolean; email: string | null };

let cached: Promise<ProState> | null = null;

export function getProState(): Promise<ProState> {
  if (cached) return cached;
  cached = (async () => {
    if (!supabase) return { configured: false, loggedIn: false, isPro: false, email: null };
    try {
      const session = await getSession();
      if (!session) return { configured: true, loggedIn: false, isPro: false, email: null };
      const profile = await getProfile();
      return { configured: true, loggedIn: true, isPro: Boolean(profile?.isPro), email: profile?.email ?? session.user.email ?? null };
    } catch {
      return { configured: true, loggedIn: false, isPro: false, email: null };
    }
  })();
  return cached;
}

/** Where a "Pro" action should send someone who is not Pro yet. */
export function upgradeHref(state: ProState, next: string): string {
  if (state.loggedIn) return '/pricing';
  return `/account?next=${encodeURIComponent(next)}&intent=pro`;
}
