// Header auth state. Public pages ship no Supabase code: the client is imported only when a stored
// session exists, so signed-out visitors keep the plain "Log in" link and pay nothing.
import type { Profile } from '../../lib/supabase';

const hasStoredSession = () => {
  try {
    return Object.keys(localStorage).some((k) => /^sb-.+-auth-token$/.test(k));
  } catch {
    return false;
  }
};

const initials = (name: string) =>
  name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('') || '?';

export async function initAuthNav() {
  if (!hasStoredSession()) return;
  const { getSession, getProfile, signOut, onAuthChange } = await import('../../lib/supabase');

  const outs = document.querySelectorAll<HTMLElement>('[data-auth-out]');
  const ins = document.querySelectorAll<HTMLElement>('[data-auth-in]');
  const menus = document.querySelectorAll<HTMLDetailsElement>('[data-acct-menu]');

  function paint(email: string | null, profile: Profile | null) {
    const signedIn = email !== null;
    outs.forEach((el) => (el.hidden = signedIn));
    ins.forEach((el) => (el.hidden = !signedIn));
    if (!signedIn) return;
    const name = profile?.displayName || email!.split('@')[0]!;
    document.querySelectorAll<HTMLElement>('[data-acct-name]').forEach((el) => (el.textContent = name));
    document.querySelectorAll<HTMLElement>('[data-acct-email]').forEach((el) => (el.textContent = email));
    document.querySelectorAll<HTMLElement>('[data-acct-avatar]').forEach((el) => {
      el.replaceChildren();
      if (profile?.avatarUrl) {
        const img = document.createElement('img');
        img.src = profile.avatarUrl;
        img.alt = '';
        img.width = img.height = 32;
        img.referrerPolicy = 'no-referrer';
        el.append(img);
      } else el.textContent = initials(name);
    });
  }

  async function refresh() {
    const session = await getSession().catch(() => null);
    if (!session) return paint(null, null);
    paint(session.user.email ?? '', null); // instant: initials from the email
    paint(session.user.email ?? '', await getProfile().catch(() => null));
  }

  document.querySelectorAll<HTMLButtonElement>('[data-auth-logout]').forEach((b) =>
    b.addEventListener('click', async () => {
      b.disabled = true;
      await signOut().catch(() => undefined);
      location.href = '/account';
    }),
  );
  // One menu open at a time; Escape and outside clicks close it.
  menus.forEach((m) =>
    m.addEventListener('toggle', () => m.open && menus.forEach((o) => o !== m && (o.open = false))),
  );
  document.addEventListener('click', (e) => menus.forEach((m) => m.open && !m.contains(e.target as Node) && (m.open = false)));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    menus.forEach((m) => {
      if (!m.open) return;
      m.open = false;
      m.querySelector('summary')?.focus();
    });
  });

  onAuthChange(() => void refresh());
  // The account page saves the profile; the header follows without a reload.
  window.addEventListener('yy:profile-changed', () => void refresh());
  await refresh();
}
