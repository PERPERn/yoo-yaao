// Single source of truth for branding. The final name is not chosen yet — change it here only.
export const SITE = {
  name: 'Yoo Yaao',
  tagline: 'Stay longer in Thailand — legally, easily.',
  description:
    'Find the right Thai visa for your passport, get the exact embassy checklist, and never miss a 90-day report again.',
  url: 'https://longstay-th.vercel.app',
  supportEmail: 'hello@example.com',
} as const;

export const NAV = [
  { href: '/finder', label: 'Visa Finder' },
  { href: '/visas', label: 'Visas' },
  { href: '/tools', label: 'Stay Tools' },
  { href: '/cities', label: 'Cities' },
  { href: '/buddies', label: 'Local Buddies' },
  { href: '/pricing', label: 'Pricing' },
] as const;
