import type { Buddy } from '../types/contracts';

// FICTIONAL DEMO PROFILES. These people do not exist. Ratings and session counts are made up
// to show how the marketplace works. Replace with real, vetted buddies before launch.
//
// Buddies offer practical, everyday help only. They never file visas, fill in immigration forms
// for you, or give legal or tax advice. That work belongs to licensed lawyers and agents.

export const DEMO_NOTICE =
  'Demo profiles: these Local Buddies are fictional examples that show how booking will work. Ratings and session counts are not real. Buddies help with practical things like apartment viewings, bank visits and getting around. They do not file visas or give legal or tax advice.';

export const buddies: Buddy[] = [
  {
    id: 'demo-ploy-bkk',
    displayName: 'Ploy (demo)',
    city: 'bangkok',
    bio: 'Grew up in Bangkok and has helped friends from abroad find condos along the BTS line. Knows which buildings look better online than in person.',
    languages: ['Thai', 'English'],
    services: ['Apartment viewing', 'City orientation', 'SIM and transport setup'],
    priceUsd: 35,
    rating: 4.9,
    sessions: 42,
  },
  {
    id: 'demo-mark-bkk',
    displayName: 'Mark (demo)',
    city: 'bangkok',
    bio: 'British designer, six years in Bangkok. Will walk you through three coworking spaces in an afternoon and show you where the good khao man gai is.',
    languages: ['English'],
    services: ['Coworking tour', 'City orientation'],
    priceUsd: 30,
    rating: 4.8,
    sessions: 27,
  },
  {
    id: 'demo-nok-bkk',
    displayName: 'Nok (demo)',
    city: 'bangkok',
    bio: 'Former bank teller who now teaches Thai. Comes with you to the branch, explains what staff are asking, and teaches the phrases you need for daily life.',
    languages: ['Thai', 'English'],
    services: ['Opening a bank account (accompany and translate)', 'Thai-language basics'],
    priceUsd: 45,
    rating: 4.9,
    sessions: 58,
  },
  {
    id: 'demo-arthit-cnx',
    displayName: 'Arthit (demo)',
    city: 'chiang-mai',
    bio: 'Chiang Mai local who rents out scooters to long-stayers. Knows Nimman, Santitham and the Old City street by street.',
    languages: ['Thai', 'English'],
    services: ['Apartment viewing', 'SIM and transport setup', 'City orientation'],
    priceUsd: 25,
    rating: 4.7,
    sessions: 33,
  },
  {
    id: 'demo-lena-cnx',
    displayName: 'Lena (demo)',
    city: 'chiang-mai',
    bio: 'German developer who has spent four winters in Chiang Mai. Tells you which coworking spaces have reliable fibre and good chairs.',
    languages: ['German', 'English'],
    services: ['Coworking tour', 'City orientation'],
    priceUsd: 30,
    rating: 4.8,
    sessions: 19,
  },
  {
    id: 'demo-fah-cnx',
    displayName: 'Fah (demo)',
    city: 'chiang-mai',
    bio: 'University language tutor. Short, practical Thai lessons focused on markets, taxis and talking to your landlord.',
    languages: ['Thai', 'English', 'Chinese'],
    services: ['Thai-language basics', 'Opening a bank account (accompany and translate)'],
    priceUsd: 40,
    rating: 5.0,
    sessions: 71,
  },
  {
    id: 'demo-somchai-hkt',
    displayName: 'Somchai (demo)',
    city: 'phuket',
    bio: 'Born in Rawai, works in property management. Helps you compare rentals in the south before the high-season price jump.',
    languages: ['Thai', 'English'],
    services: ['Apartment viewing', 'City orientation', 'SIM and transport setup'],
    priceUsd: 45,
    rating: 4.8,
    sessions: 24,
  },
  {
    id: 'demo-jess-hkt',
    displayName: 'Jess (demo)',
    city: 'phuket',
    bio: 'Australian copywriter and Muay Thai regular in Chalong. Shows newcomers the coworking spaces, gyms and quiet beaches around the south of the island.',
    languages: ['English'],
    services: ['Coworking tour', 'City orientation'],
    priceUsd: 35,
    rating: 4.7,
    sessions: 15,
  },
  {
    id: 'demo-mai-hkt',
    displayName: 'Mai (demo)',
    city: 'phuket',
    bio: 'Hotel front-office manager in Phuket Town. Goes with you to open a bank account and sort out a local SIM, and teaches survival Thai along the way.',
    languages: ['Thai', 'English', 'Russian'],
    services: ['Opening a bank account (accompany and translate)', 'SIM and transport setup', 'Thai-language basics'],
    priceUsd: 60,
    rating: 4.9,
    sessions: 38,
  },
];
