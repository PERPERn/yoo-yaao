// Overstay fine and re-entry bans. Every number here is from the Bangkok Immigration FAQ
// (Ministry of Interior Order No. 1/2558); re-check it before changing anything.
import type { Source } from '../types/contracts';

export const OVERSTAY_VERIFIED_ON = '2026-10-24';
export const FINE_PER_DAY_THB = 500;
export const FINE_CAP_THB = 20_000;

/** Ban if you hand yourself in (e.g. at the airport on departure). The ban applies once the overstay is longer than overDays / overYears. */
export const SURRENDER_BANS: { over: string; overDays?: number; overYears?: number; ban: number }[] = [
  { over: 'More than 90 days', overDays: 90, ban: 1 },
  { over: 'More than 1 year', overYears: 1, ban: 3 },
  { over: 'More than 3 years', overYears: 3, ban: 5 },
  { over: 'More than 5 years', overYears: 5, ban: 10 },
];
/** Ban if you are arrested and prosecuted. */
export const ARREST_BANS = [
  { over: '1 year or less', ban: 5 },
  { over: 'More than 1 year', ban: 10 },
];

export const OVERSTAY_SOURCES: Source[] = [
  { label: 'Immigration Division 1, Bangkok — FAQ: overstay fine and re-entry bans', url: 'https://bangkok.immigration.go.th/en/faq_en/', tier: 'primary' },
  { label: 'Royal Thai Embassy, Ho Chi Minh City — Thailand overstay measures (Order 1/2558)', url: 'https://hochiminh.thaiembassy.org/en/publicservice/64058-thailand-overstay-measures', tier: 'primary' },
];

const addYears = (d: Date, n: number) => {
  const x = new Date(d.getTime());
  x.setUTCFullYear(x.getUTCFullYear() + n);
  return x;
};

/** Days over = days after the last permitted day. Ban = the surrender tier you pass, or 0. */
export function overstay(until: Date, leave: Date) {
  const days = Math.max(0, Math.round((leave.getTime() - until.getTime()) / 86_400_000));
  const fine = Math.min(days * FINE_PER_DAY_THB, FINE_CAP_THB);
  let banYears = 0;
  for (const t of SURRENDER_BANS) {
    const passed = t.overDays !== undefined ? days > t.overDays : leave > addYears(until, t.overYears!);
    if (passed) banYears = t.ban;
  }
  return { days, fine, capped: days * FINE_PER_DAY_THB > FINE_CAP_THB, banYears };
}
