// Shared data contracts. Content, frontend and backend agents all build against these shapes.
// Change them only through the main agent.

export type Source = {
  label: string;      // e.g. "Royal Thai Embassy, London — DTV"
  url: string;        // official/primary source preferred
  tier: 'primary' | 'secondary';
};

export type VisaSlug = 'dtv' | 'ltr' | 'privilege' | 'visa-exempt' | 'retirement';

export type Visa = {
  slug: VisaSlug;
  name: string;                 // "Destination Thailand Visa (DTV)"
  shortName: string;            // "DTV"
  summary: string;              // one sentence
  bestFor: string[];            // ["Remote workers", "Freelancers"]
  stay: {
    perEntryDays: number;       // max days per entry
    validityYears: number | null;
    extendable: string;         // plain-language extension rule
  };
  cost: { amount: number; currency: 'THB' | 'USD' | 'EUR'; note?: string };
  eligibility: {
    minAge?: number;
    minIncomeUsdYear?: number;
    minSavingsThb?: number;
    remoteWorkAllowed: boolean; // working for foreign employers/clients only
    other: string[];
  };
  documents: string[];          // checklist items
  steps: string[];              // how to apply, in order
  gotchas: string[];            // common mistakes, recent rule changes
  sources: Source[];
  verifiedAt: string;           // ISO date the facts were last checked against sources
};

// Visa Finder input and output
export type Purpose = 'remote-work' | 'tourism' | 'retire' | 'invest' | 'study' | 'soft-power';
export type FinderInput = {
  nationality: string;          // ISO 3166-1 alpha-2
  residenceCountry: string;     // ISO alpha-2 — DTV must be filed in country of residence
  purpose: Purpose;
  age: number;
  incomeUsdYear: number;
  savingsThb: number;
  stayDays: number;
};
export type FinderResult = {
  slug: VisaSlug;
  score: number;                // 0–100 fit score
  verdict: 'great-fit' | 'possible' | 'not-eligible';
  reasons: string[];            // why it fits / doesn't
};

export type City = {
  slug: 'bangkok' | 'chiang-mai' | 'phuket';
  name: string;
  summary: string;
  costOfLivingUsdMonth: { budget: number; comfortable: number }; // ranges, hand-curated
  rentUsdMonth: { studio: number; oneBed: number };
  internetMbps: number;
  bestMonths: string[];
  watchOut: string[];           // e.g. Chiang Mai smoke season Mar–Apr
  neighborhoods: { name: string; vibe: string }[];
  coworking: { name: string; area: string; dayPassThb?: number; url?: string }[];
  sources: Source[];
  verifiedAt: string;
};

// Revenue products — B2C, B2B and C2C
export type ProductId =
  | 'pro_monthly'      // B2C subscription
  | 'pro_yearly'       // B2C subscription
  | 'listing_featured' // B2B featured listing (coworking/coliving/agency), monthly
  | 'buddy_session';   // C2C: traveller books a Local Buddy session; platform keeps a commission

export type Product = {
  id: ProductId;
  segment: 'B2C' | 'B2B' | 'C2C';
  name: string;
  priceUsd: number;
  interval?: 'month' | 'year';
  features: string[];
};

export type Buddy = {
  id: string;
  displayName: string;
  city: City['slug'];
  bio: string;
  languages: string[];
  services: string[];          // practical help only — never visa filing (regulated)
  priceUsd: number;            // per 60-min session
  rating: number;
  sessions: number;
  avatarUrl?: string;
};

export type Listing = {
  id: string;
  kind: 'coworking' | 'coliving' | 'agency' | 'insurance' | 'esim';
  name: string;
  city?: City['slug'];
  url: string;
  priceFrom?: string;
  featured: boolean;
  affiliate?: boolean;          // show "Paid link" disclosure beside the link (FTC)
};
