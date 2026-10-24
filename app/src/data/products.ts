import type { Product, ProductId } from '../types/contracts';

// Prices set by the Business agent (see docs/business-model.md §3): Pro raised from $6/$39 to $8/$59
// to sit inside the researched $7–15/mo comparable range.
// The checkout API looks products up here, so ids must match ProductId.
export const products: Product[] = [
  {
    id: 'pro_monthly',
    segment: 'B2C',
    name: 'Stay Pro — Monthly',
    priceUsd: 8,
    interval: 'month',
    features: [
      'Save your stays and visa dates',
      'Email reminders: 90-day report, visa expiry, TM30',
      'Document checklist tracker synced across devices',
      '180-day tax-residency counter',
      'Alerts when Thai visa rules change',
    ],
  },
  {
    id: 'pro_yearly',
    segment: 'B2C',
    name: 'Stay Pro — Yearly',
    priceUsd: 59,
    interval: 'year',
    features: ['Everything in Monthly', 'Save 38% vs paying monthly', 'PDF checklist export'],
  },
  {
    id: 'listing_featured',
    segment: 'B2B',
    name: 'Featured Listing',
    priceUsd: 49,
    interval: 'month',
    features: [
      'Top placement on your city page',
      '"Verified partner" badge',
      'Monthly clicks report',
      'Founding-partner price, locked for the first 20 partners',
    ],
  },
  {
    id: 'buddy_session',
    segment: 'C2C',
    name: 'Local Buddy session (60 min)',
    priceUsd: 35, // default; the actual price comes from the buddy's profile
    features: ['Practical help from a vetted local', 'Platform fee 20% included', 'Refund if the buddy cancels'],
  },
];

export const PLATFORM_FEE_RATE = 0.2; // C2C commission

export function getProduct(id: ProductId): Product | undefined {
  return products.find((p) => p.id === id);
}
