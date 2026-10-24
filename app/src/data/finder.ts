import type { FinderInput, FinderResult, VisaSlug } from '../types/contracts';
import { THB_PER_USD, visaBySlug } from './visas';

// Visa Finder: deterministic, explainable scoring. No randomness, no network.
// Every threshold comes from visas.ts (sourced and dated there) or is documented below.
//
// Scoring model, per visa:
//   1. Hard checks (age, money, nationality). Failing one => verdict 'not-eligible', score <= 25.
//   2. Fit points for purpose and planned stay length.
//   3. Score is clamped to 0–100. Verdict: 'great-fit' >= 75, 'possible' 40–74, otherwise 'not-eligible'.
// Each visa returns 2–4 plain-English reasons.

export type Country = { code: string; name: string };

// Most common nationalities for the app's audience first, then the rest A–Z.
export const COUNTRIES: Country[] = [
  { code: 'IN', name: 'India' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  // EU
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'PL', name: 'Poland' },
  { code: 'SE', name: 'Sweden' },
  { code: 'BE', name: 'Belgium' },
  { code: 'AT', name: 'Austria' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'IE', name: 'Ireland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'GR', name: 'Greece' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'HU', name: 'Hungary' },
  { code: 'RO', name: 'Romania' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'HR', name: 'Croatia' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'EE', name: 'Estonia' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MT', name: 'Malta' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'AU', name: 'Australia' },
  { code: 'CN', name: 'China' },
  { code: 'RU', name: 'Russia' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  // Rest, A–Z
  { code: 'AR', name: 'Argentina' },
  { code: 'BR', name: 'Brazil' },
  { code: 'CA', name: 'Canada' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'EG', name: 'Egypt' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IL', name: 'Israel' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MX', name: 'Mexico' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'NO', name: 'Norway' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PH', name: 'Philippines' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TR', name: 'Türkiye' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'VN', name: 'Vietnam' },
];

export const countryName = (code: string): string =>
  COUNTRIES.find((c) => c.code === code)?.name ?? code;

// 30-day tourist visa exemption list effective 15 Sept 2026 (60 countries/territories).
// Source: TAT News, 1 Sept 2026 — https://www.tatnews.org/2026/09/thailand-introduces-new-30-day-and-15-day-visa-exemption-rules-from-15-september/
export const VISA_EXEMPT_30 = new Set<string>([
  'AU', 'AT', 'BH', 'BE', 'BG', 'BT', 'BN', 'CA', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FJ', 'FI',
  'FR', 'GE', 'DE', 'GR', 'HU', 'IS', 'ID', 'IN', 'IE', 'IL', 'IT', 'JP', 'JO', 'KW', 'KG',
  'LV', 'LI', 'LT', 'LU', 'MT', 'MY', 'MV', 'NL', 'NZ', 'NO', 'OM', 'PH', 'PL', 'PT', 'QA',
  'RO', 'SA', 'SG', 'SK', 'SI', 'ZA', 'ES', 'SE', 'CH', 'TW', 'TR', 'UA', 'AE', 'GB', 'US',
]);

// Nationalities covered by separate bilateral agreements (TAT confirms these "continue to apply"
// with 90, 30 or 14-day stays but does not list them). Membership below is from secondary
// sources (Vialto Partners alert, Sept 2026) and long-standing agreements; the stay length
// is not asserted here — the Finder tells the user to check it.
export const VISA_EXEMPT_BILATERAL = new Set<string>([
  'CN', 'RU', 'HK', 'MO', 'KZ', 'LA', 'MN', 'KR', 'BR', 'AR', 'CL', 'PE', 'VN',
]);

export const FINDER_DEFAULTS: FinderInput = {
  nationality: 'US',
  residenceCountry: 'US',
  purpose: 'remote-work',
  age: 32,
  incomeUsdYear: 50000,
  savingsThb: 600000,
  stayDays: 180,
};

const fmtThb = (n: number) => `${n.toLocaleString('en-US')} THB`;
const fmtUsd = (n: number) => `USD ${n.toLocaleString('en-US')}`;
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function verdictFor(score: number, eligible: boolean): FinderResult['verdict'] {
  if (!eligible || score < 40) return 'not-eligible';
  return score >= 75 ? 'great-fit' : 'possible';
}

function result(slug: VisaSlug, score: number, eligible: boolean, reasons: string[]): FinderResult {
  const s = eligible ? clamp(score) : Math.min(clamp(score), 25);
  return { slug, score: s, verdict: verdictFor(s, eligible), reasons: reasons.slice(0, 4) };
}

function scoreDtv(i: FinderInput): FinderResult {
  const v = visaBySlug('dtv');
  const minSavings = v.eligibility.minSavingsThb ?? 500000;
  const reasons: string[] = [];
  let eligible = true;
  let score = 50;

  if (i.savingsThb >= minSavings) {
    score += 15;
    reasons.push(`Your savings (${fmtThb(i.savingsThb)}) meet the ${fmtThb(minSavings)} minimum.`);
  } else {
    eligible = false;
    reasons.push(`You need at least ${fmtThb(minSavings)} in savings; you entered ${fmtThb(i.savingsThb)}.`);
  }

  if (i.purpose === 'remote-work' || i.purpose === 'soft-power') {
    score += 25;
    reasons.push(
      i.purpose === 'remote-work'
        ? 'Built for remote workers and freelancers paid from outside Thailand.'
        : 'Covers soft-power courses such as Muay Thai or Thai cooking that last 6 months or more.',
    );
  } else if (i.purpose === 'retire' || i.purpose === 'tourism') {
    score -= 25;
    reasons.push('DTV needs remote work or a soft-power course as your reason to stay.');
  } else {
    eligible = false;
    reasons.push(
      i.purpose === 'study'
        ? 'Full-time study needs an education (ED) visa; embassies reject DTV for this purpose.'
        : 'DTV does not cover investing. Look at LTR or Privilege.',
    );
  }

  if (i.stayDays > 60) score += 10;
  else score -= 15;

  // Filing rule from 31 Aug 2026: apply via the mission covering your nationality or permanent residence.
  if (i.residenceCountry === 'TH') {
    score -= 10;
    reasons.push(
      `You can't apply from inside Thailand. Since 31 Aug 2026 you file with the Thai embassy for ${countryName(i.nationality)} (your nationality).`,
    );
  } else if (i.residenceCountry !== i.nationality) {
    reasons.push(
      `File in ${countryName(i.residenceCountry)} only if you hold permanent residence there; otherwise file in ${countryName(i.nationality)}. A police certificate is now required.`,
    );
  } else {
    reasons.push(`File with the Thai embassy covering ${countryName(i.nationality)}, with a police certificate (required since 31 Aug 2026).`);
  }

  return result('dtv', score, eligible, reasons);
}

function scoreLtr(i: FinderInput): FinderResult {
  const reasons: string[] = [];
  const savingsUsd = i.savingsThb / THB_PER_USD;
  let score = 30;
  let eligible = false;

  if (i.purpose === 'invest' || savingsUsd >= 1_000_000) {
    if (savingsUsd >= 1_000_000) {
      eligible = true;
      score = 85;
      reasons.push('Your assets clear the USD 1M Wealthy Global Citizen bar.');
      reasons.push('You also need USD 500,000 already invested in Thai bonds, a Thai company or Thai property.');
    } else {
      reasons.push(`Wealthy Global Citizen needs USD 1M in assets; your savings are about ${fmtUsd(Math.round(savingsUsd))}.`);
    }
  }

  if (!eligible && i.purpose === 'retire') {
    if (i.age < 50) {
      reasons.push('The Wealthy Pensioner route starts at age 50.');
    } else if (i.incomeUsdYear >= 80000) {
      eligible = true;
      score = 85;
      reasons.push(`At 50+ with ${fmtUsd(i.incomeUsdYear)} a year, you fit Wealthy Pensioner if that income is passive (pension, dividends).`);
    } else if (i.incomeUsdYear >= 40000) {
      eligible = true;
      score = 60;
      reasons.push('With USD 40,000–80,000 passive income you also need a USD 250,000 investment in Thailand.');
    } else {
      reasons.push('Wealthy Pensioner needs at least USD 40,000 a year in passive income.');
    }
  }

  if (!eligible && i.purpose === 'remote-work') {
    if (i.incomeUsdYear >= 80000) {
      eligible = true;
      score = 70;
      reasons.push(`Your income (${fmtUsd(i.incomeUsdYear)}) meets the USD 80,000 Work-from-Thailand bar.`);
      reasons.push('Your employer must be a listed company, or have 3+ years of operation and USD 50M+ revenue over 3 years. Freelancers do not qualify.');
    } else if (i.incomeUsdYear >= 40000) {
      eligible = true;
      score = 45;
      reasons.push('USD 40,000–80,000 income works only with a master\'s degree and a qualifying large employer.');
    } else {
      reasons.push('Work-from-Thailand needs at least USD 40,000 a year (USD 80,000 without a master\'s).');
    }
  }

  if (!eligible && reasons.length < 2) {
    reasons.push('LTR is for high earners, wealthy retirees, investors and skilled professionals; your answers don\'t match a category.');
  }
  if (!eligible && reasons.length < 2) {
    reasons.push('Most LTR categories need USD 80,000+ a year in income or USD 1M+ in assets.');
  }
  if (eligible) {
    if (i.stayDays >= 365) score += 10;
    reasons.push('10 years, a yearly report instead of 90-day reports, and a 50,000 THB fee.');
  }
  return result('ltr', score, eligible, reasons);
}

function scorePrivilege(i: FinderInput): FinderResult {
  const v = visaBySlug('privilege');
  const entryFee = v.cost.amount; // Bronze; closing date unclear
  const goldFee = 900000;
  const reasons: string[] = [];
  let score = 40;
  let eligible = true;

  if (i.savingsThb >= goldFee) {
    score += 20;
    reasons.push(`You could afford a membership: Bronze ${fmtThb(entryFee)} or Gold ${fmtThb(goldFee)} for 5 years.`);
  } else if (i.savingsThb >= entryFee) {
    score += 5;
    reasons.push(`Bronze costs ${fmtThb(entryFee)}, but its closing date is unclear; Gold is ${fmtThb(goldFee)}.`);
  } else {
    eligible = false;
    reasons.push(`Memberships start at ${fmtThb(entryFee)}; you entered ${fmtThb(i.savingsThb)} in savings.`);
  }

  if (i.stayDays >= 365) {
    score += 20;
    reasons.push('Makes sense for multi-year stays: no income test and no yearly renewal paperwork.');
  } else {
    score -= 15;
    reasons.push('A 5-year membership is expensive for a stay under a year.');
  }

  if (i.purpose === 'remote-work') {
    score -= 15;
    reasons.push('No work rights come with it, so remote work is a grey area. DTV covers it explicitly.');
  } else if (i.purpose === 'retire' && i.age < 50) {
    score += 15;
    reasons.push('Under 50 you can\'t get a retirement visa, so Privilege is a common alternative.');
  } else if (i.purpose === 'retire' || i.purpose === 'tourism' || i.purpose === 'invest') {
    score += 5;
  }
  return result('privilege', score, eligible, reasons);
}

function scoreVisaExempt(i: FinderInput): FinderResult {
  const reasons: string[] = [];
  let score = 50;
  let eligible = true;

  if (VISA_EXEMPT_30.has(i.nationality)) {
    reasons.push(`${countryName(i.nationality)} passports get 30 days visa-free for tourism (cut from 60 days on 15 Sept 2026).`);
  } else if (VISA_EXEMPT_BILATERAL.has(i.nationality)) {
    score -= 5;
    reasons.push(`${countryName(i.nationality)} is covered by a separate bilateral agreement. Check its stay length with the Thai embassy.`);
  } else {
    eligible = false;
    reasons.push(`${countryName(i.nationality)} is not on the 30-day exemption list, so you'll likely need a tourist visa or visa on arrival.`);
  }

  if (i.stayDays <= 30) {
    score += 40;
    reasons.push('Your trip fits inside one 30-day stay.');
  } else if (i.stayDays <= 60) {
    score += 5;
    reasons.push('You would need the 30-day extension (officer\'s discretion, reported 1,900 THB) to stay this long.');
  } else {
    score -= 40;
    reasons.push('30 days plus one 30-day extension is the most you can stay on one entry.');
  }

  if (i.purpose === 'remote-work') {
    score -= 15;
    reasons.push('The exemption is for tourism only. Working remotely on it is not covered.');
  } else if (i.purpose !== 'tourism') {
    score -= 15;
  }
  return result('visa-exempt', score, eligible, reasons);
}

function scoreRetirement(i: FinderInput): FinderResult {
  const v = visaBySlug('retirement');
  const minAge = v.eligibility.minAge ?? 50;
  const minSavings = v.eligibility.minSavingsThb ?? 800000;
  const monthlyIncomeThb = (i.incomeUsdYear * THB_PER_USD) / 12;
  const reasons: string[] = [];
  let score = 50;
  let eligible = true;

  if (i.age >= minAge) {
    reasons.push(`You meet the age rule (${minAge}+).`);
  } else {
    eligible = false;
    reasons.push(`You must be ${minAge} or older; you entered ${i.age}.`);
  }

  const savingsOk = i.savingsThb >= minSavings;
  const incomeOk = monthlyIncomeThb >= 65000;
  const comboOk = i.savingsThb + monthlyIncomeThb * 12 >= minSavings;
  if (savingsOk || incomeOk) {
    score += 20;
    reasons.push(
      savingsOk
        ? `Your savings meet the ${fmtThb(minSavings)} requirement.`
        : 'Your income clears 65,000 THB a month, if it is pension income you can document.',
    );
  } else if (comboOk) {
    score += 10;
    reasons.push(`Savings plus a year of income can add up to ${fmtThb(minSavings)}; embassies accept this mix.`);
  } else {
    eligible = false;
    reasons.push(`You need ${fmtThb(minSavings)} in savings or 65,000 THB a month in income.`);
  }

  if (i.purpose === 'retire') {
    score += 25;
  } else if (i.purpose === 'remote-work') {
    score -= 20;
    reasons.push('Any work, including remote work, is prohibited on a retirement visa.');
  } else {
    score -= 10;
  }
  if (i.stayDays >= 180) score += 5;
  if (eligible) reasons.push('You also need health insurance (recent embassy pages ask for 3M THB cover) and police and medical certificates.');

  return result('retirement', score, eligible, reasons);
}

/** Rank all five visas for a profile. Deterministic; ties break by a fixed visa order. */
export function rankVisas(input: FinderInput): FinderResult[] {
  const order: VisaSlug[] = ['dtv', 'ltr', 'retirement', 'privilege', 'visa-exempt'];
  const results = [scoreDtv(input), scoreLtr(input), scoreRetirement(input), scorePrivilege(input), scoreVisaExempt(input)];
  return results.sort((a, b) => b.score - a.score || order.indexOf(a.slug) - order.indexOf(b.slug));
}
