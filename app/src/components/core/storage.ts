// Safe browser storage. Private windows and blocked storage throw; the tools must still work.

export function readJSON<T>(key: string, fallback: T, store: 'local' | 'session' = 'local'): T {
  try {
    const raw = (store === 'local' ? localStorage : sessionStorage).getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown, store: 'local' | 'session' = 'local'): boolean {
  try {
    (store === 'local' ? localStorage : sessionStorage).setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string, store: 'local' | 'session' = 'local'): void {
  try {
    (store === 'local' ? localStorage : sessionStorage).removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Document checklist state, shared by /visas/[slug] and /tools/checklist. Keyed by item text. */
export type ChecklistState = { done: Record<string, boolean>; notes: Record<string, string> };
export const checklistKey = (slug: string) => `ls-checklist:${slug}`;
export const readChecklist = (slug: string): ChecklistState => {
  const s = readJSON<Partial<ChecklistState>>(checklistKey(slug), {});
  return { done: s.done ?? {}, notes: s.notes ?? {} };
};
export const writeChecklist = (slug: string, s: ChecklistState) => writeJSON(checklistKey(slug), s);

/** Stays saved on this device (free tier). */
export type LocalStay = { visaType: string; entryDate: string; expiryDate?: string | null; lastReportDate?: string | null; savedAt: string };
export const STAYS_KEY = 'ls-stays';
export function saveLocalStay(stay: Omit<LocalStay, 'savedAt'>): void {
  const all = readJSON<LocalStay[]>(STAYS_KEY, []);
  all.unshift({ ...stay, savedAt: new Date().toISOString() });
  writeJSON(STAYS_KEY, all.slice(0, 10));
}
