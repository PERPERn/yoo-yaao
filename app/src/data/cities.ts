import type { City } from '../types/contracts';

// Hand-curated city data, checked 2026-10-23. Not scraped from Numbeo or any paid index.
// Costs are USD for one person and are ranges rounded from the published sources below
// (Thaiger cost-of-living article, Aug 2026, ~33 THB/USD; Expatsi, updated May 2026).
// "budget" = local-style living outside the premium districts; "comfortable" = a modern condo
// in an expat area, eating out often, coworking membership.
// Internet speeds are typical fixed-broadband figures for a condo fibre plan, not measured
// medians per city — Ookla's Speedtest Global Index is the reference for national medians.
// Coworking day-pass prices come from 2026 guides and change often; omitted where sources conflicted.

export const cities: City[] = [
  {
    slug: 'bangkok',
    name: 'Bangkok',
    summary:
      'Thailand\'s capital: the best internet, hospitals and transport in the country, the most coworking choice, and the main immigration and embassy offices.',
    costOfLivingUsdMonth: { budget: 900, comfortable: 1900 },
    rentUsdMonth: { studio: 450, oneBed: 750 },
    internetMbps: 300,
    bestMonths: ['November', 'December', 'January', 'February'],
    watchOut: [
      'Hot season (March–May) regularly passes 35°C.',
      'Rainy season (roughly June–October) brings afternoon downpours and street flooding.',
      'PM2.5 haze can spike from January to March. Check an air-quality app.',
      'Central rents along Sukhumvit, Silom and Sathorn run about double the outer districts.',
    ],
    neighborhoods: [
      { name: 'Sukhumvit (Asok–Phrom Phong)', vibe: 'Expat heartland on the BTS line, with malls, restaurants and the most condos.' },
      { name: 'Thong Lo / Ekkamai', vibe: 'Trendy cafés, bars and coworking, a bit pricier.' },
      { name: 'Ari', vibe: 'Leafy, local and café-heavy, popular with creatives.' },
      { name: 'Silom / Sathorn', vibe: 'Business district near Lumphini Park, good transit.' },
      { name: 'On Nut', vibe: 'Cheaper Sukhumvit option further out on the BTS.' },
    ],
    coworking: [
      { name: 'JustCo Gaysorn Amarin', area: 'Chit Lom', dayPassThb: 750, url: 'https://www.justcoglobal.com/' },
      { name: 'True Digital Park', area: 'Punnawithi (Sukhumvit 101)', dayPassThb: 500, url: 'https://www.truedigitalpark.com/' },
      { name: 'The Hive Thonglor', area: 'Thong Lo', url: 'https://thehive.co.th/' },
      { name: 'WeWork T-One', area: 'Thong Lo / Ekkamai', url: 'https://www.wework.com/' },
      { name: 'Glowfish Asoke', area: 'Asok' },
    ],
    sources: [
      {
        label: 'Thaiger — How much does it cost to live in Thailand in 2026 (Aug 2026)',
        url: 'https://thethaiger.com/news/business/how-much-does-it-cost-to-live-in-thailand-in-2026',
        tier: 'secondary',
      },
      {
        label: 'Expatsi — Cost of living in Thailand 2026 (updated May 2026)',
        url: 'https://expatsi.com/continents/asia/cost-of-living-thailand-bangkok-chiang-mai-islands/',
        tier: 'secondary',
      },
      {
        label: 'Thai Holiday Guide — Coworking spaces in Bangkok (updated Jun 2026)',
        url: 'https://www.thaiholidayguide.com/coworking-spaces-bangkok/',
        tier: 'secondary',
      },
    ],
    verifiedAt: '2026-10-23',
  },
  {
    slug: 'chiang-mai',
    name: 'Chiang Mai',
    summary:
      'Northern Thailand\'s nomad capital: cheaper rent, a slower pace, mountains on the doorstep and a big, friendly coworking scene around Nimman and the Old City.',
    costOfLivingUsdMonth: { budget: 700, comfortable: 1400 },
    rentUsdMonth: { studio: 250, oneBed: 450 },
    internetMbps: 250,
    bestMonths: ['November', 'December', 'January'],
    watchOut: [
      'Smoke season, roughly March–April (sometimes from February): crop and forest burning can push PM2.5 to some of the worst levels in the world. Many nomads leave for these weeks.',
      'Rents in Nimman have risen fast since 2023, and the best condos fill up from November.',
      'No metro. You will need Grab, a scooter or a songthaew.',
    ],
    neighborhoods: [
      { name: 'Nimman', vibe: 'Café and coworking central, walkable, the busiest nomad area.' },
      { name: 'Old City', vibe: 'Temples, moats and guesthouses, more charm and cheaper rooms.' },
      { name: 'Santitham', vibe: 'Local and quieter, a short ride from Nimman with lower rents.' },
      { name: 'Hang Dong / Mae Hia', vibe: 'Houses with gardens south of town, popular with families.' },
    ],
    coworking: [
      { name: 'Punspace', area: 'Wiang Kaew / Tha Phae Gate', url: 'https://www.punspace.com/' },
      { name: 'Yellow Coworking', area: 'Nimman', dayPassThb: 429 },
      { name: 'Alt_ChiangMai', area: 'Old City (West Gate)', dayPassThb: 320 },
      { name: 'CAMP at Maya', area: 'Nimman (Maya Mall)' },
      { name: 'Hub53', area: 'Su Thep (Chonprathan Rd, near Nimman)', url: 'https://www.hub53.com/' },
    ],
    sources: [
      {
        label: 'Thaiger — How much does it cost to live in Thailand in 2026 (Aug 2026)',
        url: 'https://thethaiger.com/news/business/how-much-does-it-cost-to-live-in-thailand-in-2026',
        tier: 'secondary',
      },
      {
        label: 'Expatsi — Cost of living in Thailand 2026 (updated May 2026)',
        url: 'https://expatsi.com/continents/asia/cost-of-living-thailand-bangkok-chiang-mai-islands/',
        tier: 'secondary',
      },
      {
        label: 'NASA Earth Observatory — Smoke shrouds northern Thailand',
        url: 'https://science.nasa.gov/earth/earth-observatory/smoke-shrouds-northern-thailand/',
        tier: 'primary',
      },
      {
        label: 'Chiang Mai Citylife — Wildfire season nears its end (2026)',
        url: 'https://www.chiangmaicitylife.com/citynews/general/chiang-mai-skies-clear-as-wildfire-season-nears-its-end/',
        tier: 'secondary',
      },
      {
        label: 'Thai Holiday Guide — Coworking spaces in Chiang Mai',
        url: 'https://www.thaiholidayguide.com/coworking-spaces-chiang-mai/',
        tier: 'secondary',
      },
    ],
    verifiedAt: '2026-10-23',
  },
  {
    slug: 'phuket',
    name: 'Phuket',
    summary:
      'Thailand\'s biggest island: beaches, Muay Thai camps and an international airport, with the highest rents of the three cities and a strong high-season price jump.',
    costOfLivingUsdMonth: { budget: 1100, comfortable: 2200 },
    rentUsdMonth: { studio: 450, oneBed: 800 },
    internetMbps: 200,
    bestMonths: ['November', 'December', 'January', 'February', 'March'],
    watchOut: [
      'Rents and short-stay prices jump in high season (roughly November–April); beachfront condos run about USD 790–1,500 a month.',
      'The southwest monsoon (roughly May–October) brings rough seas and red-flag beaches on the west coast.',
      'Public transport is limited. Most people rent a scooter or car, and traffic accidents are common.',
    ],
    neighborhoods: [
      { name: 'Rawai / Nai Harn', vibe: 'Laid-back south with long-stayers, Muay Thai gyms and the best coworking.' },
      { name: 'Chalong', vibe: 'Central-south, local markets and more affordable rentals.' },
      { name: 'Kata / Karon', vibe: 'Beach towns with surf in the rainy season and a tourist buzz.' },
      { name: 'Bang Tao / Cherngtalay', vibe: 'Upscale villas and beach clubs in the northwest.' },
      { name: 'Phuket Town', vibe: 'Old-town shophouses, cafés and local prices, away from the beach.' },
    ],
    coworking: [
      { name: "Let's Work", area: 'Rawai', dayPassThb: 350 },
      { name: 'Grind Time', area: 'Chalong / Rawai' },
      { name: 'The Project', area: 'Rawai' },
      { name: 'Place Coworking', area: 'Chalong', dayPassThb: 250 },
    ],
    sources: [
      {
        label: 'Thaiger — How much does it cost to live in Thailand in 2026 (Aug 2026)',
        url: 'https://thethaiger.com/news/business/how-much-does-it-cost-to-live-in-thailand-in-2026',
        tier: 'secondary',
      },
      {
        label: 'Expatsi — Cost of living in Thailand 2026 (updated May 2026)',
        url: 'https://expatsi.com/continents/asia/cost-of-living-thailand-bangkok-chiang-mai-islands/',
        tier: 'secondary',
      },
      {
        label: 'Thai Holiday Guide — Coworking spaces in Phuket',
        url: 'https://www.thaiholidayguide.com/coworking-spaces-phuket/',
        tier: 'secondary',
      },
    ],
    verifiedAt: '2026-10-23',
  },
];

// Freely licensed city photos, served locally (CSP allows images from 'self' only).
// Full attribution in public/images/cities/CREDITS.md; CC BY / BY-SA need the visible credit line.
export type CityPhoto = { src: string; alt: string; width: number; height: number; author: string; licence: string; licenceUrl: string; sourceUrl: string };
export const cityPhotos: Record<City['slug'], CityPhoto> = {
  bangkok: {
    src: '/images/cities/bangkok.webp',
    alt: 'Wat Arun, the Temple of Dawn, across the Chao Phraya River at sunset, with long-tail boats on the water',
    width: 1600,
    height: 1067,
    author: 'Trip.with.taste',
    licence: 'CC BY-SA 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Wat_Arun_on_the_sunset.jpg',
  },
  'chiang-mai': {
    src: '/images/cities/chiang-mai.webp',
    alt: 'Forested Doi Pui hills rolling away into the haze in Doi Suthep-Pui National Park, just outside Chiang Mai',
    width: 1600,
    height: 1067,
    author: 'Vyacheslav Argenberg',
    licence: 'CC BY 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Doi_Pui_mountains,_Chiang_Mai,_Thailand.jpg',
  },
  phuket: {
    src: '/images/cities/phuket.webp',
    alt: 'Waves washing over rocks at Banana Beach, Phuket, early in the morning, with jungle-covered hills behind',
    width: 1600,
    height: 1067,
    author: 'Anton Zelenov',
    licence: 'CC BY-SA 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Banana_beach_Phuket_2017_-_01.jpg',
  },
};
