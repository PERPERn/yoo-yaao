// Display helpers for visa and city facts. Pure functions; safe on server and client.
import type { Visa } from '../../types/contracts';
import { THB_PER_USD } from '../../data/visas';

export const n = (v: number) => v.toLocaleString('en-US');

export function fmtStay(days: number): string {
  if (days >= 365 && days % 365 === 0) return `${days / 365} year${days === 365 ? '' : 's'}`;
  if (days >= 1825) return `${Math.round(days / 365)} years`;
  return `${n(days)} days`;
}

export function fmtValidity(v: Visa): string {
  return v.stay.validityYears ? `${v.stay.validityYears} year${v.stay.validityYears === 1 ? '' : 's'}` : 'Single entry';
}

export function fmtCost(v: Visa): string {
  if (v.cost.amount === 0) return 'Free';
  return `${n(v.cost.amount)} ${v.cost.currency}`;
}

/** Rough USD equivalent for THB amounts, e.g. "≈ $303". */
export function approxUsd(thb: number): string {
  return `≈ $${n(Math.round(thb / THB_PER_USD))}`;
}

export function costParts(v: Visa): { value: string; unit: string; note?: string } {
  if (v.cost.amount === 0) return { value: 'Free', unit: '', note: v.cost.note };
  return { value: n(v.cost.amount), unit: v.cost.currency, note: v.cost.currency === 'THB' ? approxUsd(v.cost.amount) : undefined };
}

export function fmtDateISO(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** True when a fact was verified more than 90 days before `now` (ux-flow §0.3). */
export function isStale(iso: string, now = new Date()): boolean {
  const d = new Date(iso);
  return !Number.isNaN(d.getTime()) && now.getTime() - d.getTime() > 90 * 86_400_000;
}

export const THAI_CITY_NAMES: Record<string, string> = {
  bangkok: 'กรุงเทพฯ',
  'chiang-mai': 'เชียงใหม่',
  phuket: 'ภูเก็ต',
};
