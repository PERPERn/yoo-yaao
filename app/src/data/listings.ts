import type { Listing } from '../types/contracts';

// Partner directory: real coworking/coliving brands per city, plus insurance and eSIM.
//
// AFFILIATE NOTE: no affiliate accounts exist yet, so every entry has `affiliate: false` and links
// point at the brand's own homepage. When accounts are approved, replace `url` with the tracked link
// (SafetyWing Ambassador program, Genki partner program, Airalo partner program) and set
// `affiliate: true` so the UI shows the "Paid link" disclosure.
//
// FEATURED: `featured: true` demos the paid B2B featured slot (listing_featured product).
// The two featured entries below are demo placements only; nobody has paid for them.
//
// priceFrom: coworking day passes from 2026 guides (checked 2026-10-23); confirm with the venue.
// Omitted where we could not confirm a current price.

export const listings: Listing[] = [
  // Bangkok
  {
    id: 'bkk-the-hive-thonglor',
    kind: 'coworking',
    name: 'The Hive Thonglor',
    city: 'bangkok',
    url: 'https://thehive.co.th/',
    featured: true,
    affiliate: false,
  },
  {
    id: 'bkk-justco-gaysorn',
    kind: 'coworking',
    name: 'JustCo Gaysorn Amarin',
    city: 'bangkok',
    url: 'https://www.justcoglobal.com/',
    priceFrom: '750 THB / day',
    featured: false,
    affiliate: false,
  },
  {
    id: 'bkk-true-digital-park',
    kind: 'coworking',
    name: 'True Digital Park',
    city: 'bangkok',
    url: 'https://www.truedigitalpark.com/',
    priceFrom: '500 THB / day',
    featured: false,
    affiliate: false,
  },
  {
    id: 'bkk-unionspace',
    kind: 'coworking',
    name: 'UnionSpace',
    city: 'bangkok',
    url: 'https://unionspace.co.th/',
    featured: false,
    affiliate: false,
  },
  {
    id: 'bkk-regus',
    kind: 'coworking',
    name: 'Regus Bangkok',
    city: 'bangkok',
    url: 'https://www.regus.com/en-gb/thailand/bangkok/coworking',
    featured: false,
    affiliate: false,
  },

  // Chiang Mai
  {
    id: 'cnx-punspace',
    kind: 'coworking',
    name: 'Punspace',
    city: 'chiang-mai',
    url: 'https://www.punspace.com/',
    featured: true,
    affiliate: false,
  },
  {
    id: 'cnx-hub53-coliving',
    kind: 'coliving',
    name: 'Hub53 Coworking & Coliving',
    city: 'chiang-mai',
    url: 'https://www.hub53.com/coliving',
    featured: false,
    affiliate: false,
  },
  {
    id: 'cnx-hub53-coworking',
    kind: 'coworking',
    name: 'Hub53 Coworking',
    city: 'chiang-mai',
    url: 'https://www.hub53.com/',
    featured: false,
    affiliate: false,
  },

  // Phuket
  {
    id: 'hkt-spaces',
    kind: 'coworking',
    name: 'Spaces Phuket',
    city: 'phuket',
    url: 'https://www.spacesworks.com/en/th/phuket/coworking',
    featured: false,
    affiliate: false,
  },

  // Insurance (nationwide)
  {
    id: 'ins-safetywing',
    kind: 'insurance',
    name: 'SafetyWing Nomad Insurance',
    url: 'https://safetywing.com/',
    featured: false,
    affiliate: false,
  },
  {
    id: 'ins-genki',
    kind: 'insurance',
    name: 'Genki Explorer / Resident',
    url: 'https://genki.world/',
    featured: false,
    affiliate: false,
  },

  // eSIM (nationwide)
  {
    id: 'esim-airalo',
    kind: 'esim',
    name: 'Airalo Thailand eSIM',
    url: 'https://www.airalo.com/',
    featured: false,
    affiliate: false,
  },
];
