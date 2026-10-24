// Derived pricing facts for the money pages. Prices come from data/products.ts; the only number
// defined here is the Verified Agent plan, which is sold by contact (no ProductId / Stripe product).
import { getProduct, PLATFORM_FEE_RATE } from '../../data/products';
import { buddies } from '../../data/buddies';
import type { Product } from '../../types/contracts';

function must(id: Parameters<typeof getProduct>[0]): Product {
  const p = getProduct(id);
  if (!p) throw new Error(`Missing product ${id} in data/products.ts`);
  return p;
}

export const PRO_MONTHLY = must('pro_monthly');
export const PRO_YEARLY = must('pro_yearly');
export const LISTING = must('listing_featured');
export const BUDDY_SESSION = must('buddy_session');

/** Yearly saving vs 12 × monthly, rounded down so we never overstate it ("Save 38%"). */
export const YEARLY_SAVING_PCT = Math.floor((1 - PRO_YEARLY.priceUsd / (PRO_MONTHLY.priceUsd * 12)) * 100);
export const YEARLY_PER_MONTH = Math.round((PRO_YEARLY.priceUsd / 12) * 100) / 100;

export const FEE_PCT = Math.round(PLATFORM_FEE_RATE * 100);
export const BUDDY_KEEP_PCT = 100 - FEE_PCT;
export const feeFor = (price: number) => Math.round(price * PLATFORM_FEE_RATE * 100) / 100;

const prices = buddies.map((b) => b.priceUsd);
export const BUDDY_MIN = Math.min(...prices);
export const BUDDY_MAX = Math.max(...prices);

/** Sold by contact only (business-model.md): subscription for agencies that receive expert-help leads. */
export const VERIFIED_AGENT = {
  name: 'Verified Agent',
  priceUsd: 199,
  perLeadUsd: '40–110',
  features: [
    'Qualified leads from the "Get expert help" form',
    'Business registration checked before you go live',
    '"Verified agent" badge on visa guides',
    'Or pay per lead instead of monthly',
  ],
} as const;

export const CITY_OPTIONS = [
  { value: 'bangkok', label: 'Bangkok' },
  { value: 'chiang-mai', label: 'Chiang Mai' },
  { value: 'phuket', label: 'Phuket' },
] as const;

export const cityLabel = (slug: string) => CITY_OPTIONS.find((c) => c.value === slug)?.label ?? slug;

/** Free features for the Free vs Pro comparison (Pro-only ones live in data/products.ts). */
export const FREE_FEATURES = [
  'Visa Finder and every visa guide',
  'You count it yourself: 90-day, stay and 180-day tax counters, on this device',
  'Document checklists, on this device',
  'Add deadlines to your own calendar (.ics)',
];
