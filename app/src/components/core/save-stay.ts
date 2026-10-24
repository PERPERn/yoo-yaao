// "Save this stay": Free → saved on this device + Pro prompt; Pro → saved to the account.
import { saveStay, type StayInput } from '../../lib/supabase';
import { getProState, upgradeHref } from './pro';
import { saveLocalStay } from './storage';

export async function handleSaveStay(hint: HTMLElement, stay: StayInput, nextPath: string): Promise<void> {
  const text = hint.querySelector<HTMLElement>('[data-hint-text]');
  const link = hint.querySelector<HTMLAnchorElement>('[data-hint-link]');
  const login = hint.querySelector<HTMLAnchorElement>('[data-hint-login]');
  const set = (msg: string, ok = false) => {
    if (text) text.textContent = msg;
    hint.dataset.state = ok ? 'ok' : 'locked';
    hint.hidden = false;
  };

  saveLocalStay({ visaType: stay.visaType, entryDate: stay.entryDate, expiryDate: stay.expiryDate, lastReportDate: stay.lastReportDate });
  const state = await getProState();

  if (state.isPro) {
    set('Saving to your account…', true);
    if (link) link.hidden = true;
    if (login) login.hidden = true;
    try {
      await saveStay(stay);
      set('Saved to your account. Your reminders are on.', true);
      if (link) {
        link.hidden = false;
        link.href = '/account#stays';
        link.textContent = 'See my stays';
      }
    } catch {
      set('Saved on this device, but we couldn’t reach your account. Try again in a minute.');
    }
    return;
  }

  set(
    state.loggedIn
      ? 'Saved on this device. Saving stays to your account and email reminders are Pro features.'
      : 'Saved on this device. To keep it in your account and get email reminders before each deadline, go Pro.',
  );
  if (link) link.href = upgradeHref(state, nextPath);
  if (login) {
    login.hidden = state.loggedIn;
    login.href = `/account?next=${encodeURIComponent(nextPath)}`;
  }
}
