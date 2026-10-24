import type { Visa, VisaSlug } from '../types/contracts';

// Visa facts for Thailand, checked against official sources on 2026-10-23.
//
// Editorial rules for this file:
// - Every visa carries at least one `tier: 'primary'` source (Thai embassy, MFA, BOI, TAT,
//   or the official operator). Secondary sources are only used where no primary page states the fact.
// - Facts we could not confirm on a primary page are called out in `gotchas` ("reported", "not confirmed").
// - Where sources disagree we say so in `gotchas` instead of picking one silently.
// - Re-verify before each release. Thai visa rules changed at least four times between 2024 and 2026.

export const VERIFIED_ON = '2026-10-23';

/** Approximate THB per USD used for rough conversions (Thaiger, Aug 2026 used ~33). */
export const THB_PER_USD = 33;

export const visas: Visa[] = [
  {
    slug: 'dtv',
    name: 'Destination Thailand Visa (DTV)',
    shortName: 'DTV',
    summary:
      'A 5-year multiple-entry visa for remote workers, freelancers and people doing "soft power" activities such as Muay Thai or Thai cooking, with up to 180 days per entry.',
    bestFor: ['Remote workers', 'Freelancers', 'Muay Thai and cooking students', 'Spouses and children of DTV holders'],
    stay: {
      perEntryDays: 180,
      validityYears: 5,
      extendable:
        'You can extend each entry once, by up to 180 more days, at a Thai immigration office. After 360 days you must leave and re-enter on the same visa.',
    },
    cost: {
      amount: 10000,
      currency: 'THB',
      note: 'The Thai MFA lists 10,000 THB, but each embassy sets its own local price. Budapest, for example, charges €350. Pay what your embassy lists.',
    },
    eligibility: {
      minSavingsThb: 500000,
      remoteWorkAllowed: true,
      other: [
        'Work only for employers or clients outside Thailand. No Thai work permit, no Thai employer, no Thai clients.',
        'Workcation (remote work or freelancing), a Thai soft-power activity of at least 6 months, or spouse/child of a DTV holder.',
        'From 31 Aug 2026 you must apply through the Thai embassy covering your country of nationality or permanent residence.',
        'From 31 Aug 2026 you need a criminal record (police) clearance certificate.',
        'Apply from outside Thailand.',
      ],
    },
    documents: [
      'Passport bio page',
      'Recent passport-style photo on a white background',
      'Proof of permanent residence in the country where you apply (replaced "proof of current location" from 31 Aug 2026)',
      'Criminal record (police) clearance certificate (new from 31 Aug 2026)',
      'Proof of at least 500,000 THB: a 6-month bank statement, payslips or a sponsorship letter. Crypto and investment statements are not accepted.',
      'Remote workers: employment contract or certificate plus an employer letter',
      'Business owners: cover letter, company incorporation certificate and corporate tax return',
      'Freelancers: a portfolio or other proof of freelance work',
      'Soft-power track: confirmation from the course or clinic plus a copy of its business registration',
      'Family track: marriage, birth or adoption certificate',
      'Proof of visa fee payment',
    ],
    steps: [
      'Check you can file: you apply to the Thai embassy or consulate covering your country of nationality or permanent residence.',
      'Order your police clearance certificate early. It is the slowest document for most people.',
      'Download a 6-month bank statement showing at least 500,000 THB, plus your work or course documents.',
      'Create an account at thaievisa.go.th, choose your embassy, upload documents and pay the fee.',
      'Watch your email. The embassy may ask for more documents before it decides.',
      'Once approved, fill in the Thailand Digital Arrival Card (TDAC) before you fly and enter Thailand within the visa validity.',
      'In Thailand: file a 90-day report if you stay 90 days in a row, make sure your TM30 address is filed, and extend at immigration if you want the second 180 days.',
    ],
    gotchas: [
      'Fee conflict: the MFA infographic and the Vientiane embassy list 10,000 THB, while the Budapest embassy lists €350 and notes consulate fees of roughly USD 400–500. Prices differ by embassy.',
      'Extension fee conflict: the MFA confirms one extension of up to 180 days per entry but publishes no fee. Secondary guides say 1,900 THB (the standard extension fee); older reports said 10,000 THB. Ask your local immigration office before you go.',
      'Rule change on 31 Aug 2026: no more applying in a third country (for example, the "Laos run"). Applications filed before that date continue under the old rules.',
      'Sources disagree on which country must issue the police certificate (nationality vs. the country you apply in), and on its age limit. Follow your embassy\'s checklist.',
      'Many Thai banks have refused to open accounts for DTV holders since early 2025 (widely reported by users). Plan to rely on Wise, Revolut or a foreign card.',
      'Stay 180 days or more in one calendar year and you become a Thai tax resident. Foreign income you bring into Thailand can then be taxable.',
      'Minimum age of 20 is widely reported but was not stated on the embassy pages we checked.',
    ],
    sources: [
      {
        label: 'Thai MFA — DTV infographic (fee, stay, extension rule)',
        url: 'https://image.mfa.go.th/mfa/0/xJ3BrCz2xe/DTV_Infographic.pdf',
        tier: 'primary',
      },
      {
        label: 'Royal Thai Embassy, Budapest — DTV (documents, €350 fee, work rules; updated 18 Aug 2026)',
        url: 'https://budapest.thaiembassy.org/en/publicservice/destination-thailand-visa-dtv',
        tier: 'primary',
      },
      {
        label: 'Royal Thai Embassy, Moscow — DTV document changes from 31 Aug 2026',
        url: 'https://moscow.thaiembassy.org/en/publicservice/adjustment-to-supporting-documents-for-destination-thailand-visa-dtv-a',
        tier: 'primary',
      },
      {
        label: 'Royal Thai Embassy, Vientiane — DTV (10,000 THB fee)',
        url: 'https://vientiane.thaiembassy.org/en/page/destination-thailand-visa-dtv',
        tier: 'primary',
      },
      { label: 'Thailand e-Visa portal', url: 'https://www.thaievisa.go.th/', tier: 'primary' },
      {
        label: 'Thaiger — DTV guide (1,900 THB extension fee)',
        url: 'https://thethaiger.com/visas/dtv/',
        tier: 'secondary',
      },
    ],
    verifiedAt: VERIFIED_ON,
  },

  {
    slug: 'ltr',
    name: 'Long-Term Resident Visa (LTR)',
    shortName: 'LTR',
    summary:
      'A 10-year visa run by the Board of Investment for high earners, wealthy pensioners, investors and skilled professionals, with a yearly report instead of 90-day reports.',
    bestFor: ['High-earning remote employees', 'Wealthy retirees', 'Investors', 'Skilled professionals in target industries'],
    stay: {
      perEntryDays: 1825,
      validityYears: 10,
      extendable: 'Granted for 5 years, then renewable for another 5 years if you still meet the criteria.',
    },
    cost: {
      amount: 50000,
      currency: 'THB',
      note: 'Per person for the 10-year visa when collected in Thailand. Collecting it at an embassy abroad can cost more.',
    },
    eligibility: {
      minIncomeUsdYear: 80000,
      remoteWorkAllowed: true,
      other: [
        'Work-from-Thailand Professional: USD 80,000+ average yearly income over 2 years (USD 40,000–80,000 if you hold a master\'s degree), working for a listed company or one with 3+ years of operation and USD 50M+ combined revenue over 3 years.',
        'Wealthy Pensioner: age 50+, USD 80,000+ passive income a year (or USD 40,000–80,000 plus a USD 250,000 investment in Thailand). Salary does not count.',
        'Wealthy Global Citizen: USD 1M+ in assets and USD 500,000+ already invested in Thai bonds, a Thai company or Thai property.',
        'Highly-Skilled Professional: USD 80,000+ income (or USD 40,000+ with a science or technology master\'s) working in a targeted industry.',
        'Health insurance of at least USD 50,000, Thai social security, or USD 100,000 on deposit for 12 months.',
        'Up to 4 dependents (spouse and children under 20).',
      ],
    },
    documents: [
      'Passport',
      'Proof of income for the last 2 years (tax returns, payslips) or proof of assets and investments, depending on category',
      'Employment contract and employer company details (Work-from-Thailand and Highly-Skilled categories)',
      'Master\'s degree certificate if you use the USD 40,000 income route',
      'Health insurance with at least USD 50,000 cover, Thai social security, or a USD 100,000 deposit statement',
      'Documents for each dependent (marriage or birth certificates)',
    ],
    steps: [
      'Pick your category and check the criteria on ltr.boi.go.th.',
      'Apply online at ltr.boi.go.th for BOI qualification endorsement.',
      'Once endorsed, collect the visa in Thailand or at a Thai embassy abroad and pay the 50,000 THB fee.',
      'If you will work for a Thai company, apply for the digital work permit right away.',
      'File a report once a year instead of every 90 days.',
    ],
    gotchas: [
      'The Work-from-Thailand route is strict about your employer: freelancers and small-company employees usually do not qualify.',
      'Work-from-Thailand Professionals do not get a Thai work permit. You may only work for your overseas employer.',
      'In Feb 2025 the BOI dropped the income test for Wealthy Global Citizens and eased other rules (BOI Announcement Por. 3/2568).',
      'Tax perks depend on your category: a 17% flat income tax for Highly-Skilled Professionals and an overseas-income exemption for some categories. Check your category with the BOI before relying on them.',
      'The BOI warns about fake "authorised agents". Confirm any agent via ltr@boi.go.th or +66 2209 1109.',
    ],
    sources: [
      { label: 'Thailand BOI — LTR visa official site', url: 'https://ltr.boi.go.th/', tier: 'primary' },
      {
        label: 'Tilleke & Gibbins — Thailand eases LTR requirements (Feb 2025)',
        url: 'https://www.tilleke.com/insights/thailand-eases-requirements-for-long-term-resident-visas/',
        tier: 'secondary',
      },
    ],
    verifiedAt: VERIFIED_ON,
  },

  {
    slug: 'privilege',
    name: 'Thailand Privilege Visa (formerly Thailand Elite)',
    shortName: 'Privilege',
    summary:
      'A paid membership that comes with a 5- to 20-year multiple-entry visa. You buy it, so there is no income test, but it gives no right to work.',
    bestFor: ['Long-stayers with cash who want zero paperwork', 'Early retirees under 50', 'Frequent travellers to Thailand'],
    stay: {
      perEntryDays: 365,
      validityYears: 5,
      extendable:
        'Each entry is reported as a stay of up to 1 year, which you can extend at immigration for as long as your membership lasts. Membership runs 5 to 20 years by tier.',
    },
    cost: {
      amount: 650000,
      currency: 'THB',
      note: 'Bronze, 5 years. Gold 900,000 THB (5 yr), Platinum 1.5M (10 yr), Diamond 2.5M (15 yr), Reserve 5M (20 yr, invitation only).',
    },
    eligibility: {
      remoteWorkAllowed: false,
      other: [
        'No income or savings test. You pay the membership fee.',
        'Passport valid for at least 1 more year.',
        'You must pass a background check by Thai immigration.',
        'No Thai work permit comes with the membership.',
      ],
    },
    documents: [
      'Passport valid for at least 1 year',
      'Passport-size photo',
      'Completed Thailand Privilege application form',
    ],
    steps: [
      'Compare tiers on thailandprivilege.co.th and pick one.',
      'Apply directly with Thailand Privilege Card Co., Ltd. or an authorised agent.',
      'Wait for the background check to clear.',
      'Pay the membership fee once you are approved.',
      'Receive your Privilege Entry visa and use the members\' liaison service for 90-day reports.',
    ],
    gotchas: [
      'Stay per entry conflict: most guides say 1 year per entry, but the Thai embassy in Hong Kong lists up to 90 days. Ask Thailand Privilege before you buy.',
      'Bronze closing date is unclear: some sources say it closed 31 Dec 2025, others say it closes to new applicants on 31 Dec 2026. The official tier page still lists it.',
      'A 50,000 THB application fee, credited to the membership on approval, is reported by secondary sources but was not shown on the official page we checked.',
      'Remote work on a Privilege visa is a grey area. The membership gives no work rights.',
      'You still have to file 90-day reports, though members get help with them.',
      'Stay 180 days or more in one calendar year and you become a Thai tax resident.',
    ],
    sources: [
      {
        label: 'Thailand Privilege — compare membership packages (official operator)',
        url: 'https://www.thailandprivilege.co.th/why-thailand/compare-thailand-privilege-card-membership-packages-find-the-perfect-fit-for-you',
        tier: 'primary',
      },
      {
        label: 'Royal Thai Embassy, Hong Kong — Elite visa (90-day stay listing)',
        url: 'https://hongkong.thaiembassy.org/en/page/visa-elite',
        tier: 'primary',
      },
      {
        label: 'Thaiger — Thailand Privilege tiers and costs',
        url: 'https://thethaiger.com/visas/thailand-privilege/',
        tier: 'secondary',
      },
    ],
    verifiedAt: VERIFIED_ON,
  },

  {
    slug: 'visa-exempt',
    name: 'Visa exemption (30-day tourist entry)',
    shortName: 'Visa-exempt',
    summary:
      'Citizens of 60 countries can enter Thailand for tourism without a visa and stay 30 days. This dropped from 60 days on 15 Sept 2026.',
    bestFor: ['Short trips', 'Scouting a city before a long stay'],
    stay: {
      perEntryDays: 30,
      validityYears: null,
      extendable:
        'One extension of up to 30 days at an immigration office, at the officer\'s discretion. Reported fee: 1,900 THB.',
    },
    cost: { amount: 0, currency: 'THB', note: 'Free on entry. The optional 30-day extension is reported at 1,900 THB.' },
    eligibility: {
      remoteWorkAllowed: false,
      other: [
        'Your passport must be on the list of 60 countries and territories (includes the US, UK, India, Australia, Canada, Japan and all EU states).',
        'Tourism only. Business or work visits need a proper visa.',
        'Entries by land border are limited to two per calendar year (Malaysia, Brunei, Indonesia and Singapore are excepted).',
        'China, Russia, South Korea and some others enter under separate bilateral agreements with their own stay lengths.',
      ],
    },
    documents: [
      'Passport (most airlines require at least 6 months of validity)',
      'Thailand Digital Arrival Card (TDAC), filled in online within 3 days before arrival',
      'Onward or return ticket',
      'Proof of funds, if the officer asks',
    ],
    steps: [
      'Check your passport is on the 30-day list, or which bilateral agreement covers you.',
      'Fill in the TDAC at tdac.immigration.go.th within 3 days before you arrive. It is free.',
      'Show your passport and onward ticket at immigration and get a 30-day stamp.',
      'Need longer? Apply for a 30-day extension at a local immigration office before your stamp expires.',
    ],
    gotchas: [
      'Big change on 15 Sept 2026: the 60-day exemption ended and most nationalities now get 30 days (Royal Gazette, 31 Aug 2026). Anyone admitted before that date keeps the stay they were given.',
      'The exemption is for tourism. Working remotely on it is not covered and is a legal grey area at best.',
      'The 30-day extension is discretionary, not guaranteed. The 1,900 THB fee comes from secondary sources.',
      'Repeated back-to-back entries draw questions at the border, and land-border entries are capped at two a year.',
      'We read the TAT announcement, not the Royal Gazette text itself. TAT says bilateral agreements (90, 30 or 14 days) still apply but does not list the countries.',
      'Mauritius and Seychelles get 15 days. Azerbaijan, Belarus and Serbia use visa on arrival.',
    ],
    sources: [
      {
        label: 'Tourism Authority of Thailand — new 30-day and 15-day visa exemption rules from 15 Sept 2026',
        url: 'https://www.tatnews.org/2026/09/thailand-introduces-new-30-day-and-15-day-visa-exemption-rules-from-15-september/',
        tier: 'primary',
      },
      {
        label: 'Royal Thai Embassy, Abu Dhabi — TDAC required from 1 May 2025',
        url: 'https://abudhabi.thaiembassy.org/en/content/tdac1may2025',
        tier: 'primary',
      },
      {
        label: 'Freaking Nomads — Thailand cuts visa-free stay to 30 days',
        url: 'https://freakingnomads.com/news/thailand-officially-cuts-visa-free-stay-to-30-days/',
        tier: 'secondary',
      },
    ],
    verifiedAt: VERIFIED_ON,
  },

  {
    slug: 'retirement',
    name: 'Retirement visa (Non-Immigrant O-A, long stay)',
    shortName: 'Retirement',
    summary:
      'A 1-year visa for people aged 50 and over who can show 800,000 THB in savings or 65,000 THB a month in income, renewable every year.',
    bestFor: ['Retirees aged 50+', 'Pensioners with a steady income'],
    stay: {
      perEntryDays: 365,
      validityYears: 1,
      extendable:
        'Renew every year at your local immigration office if you still meet the money rules. The usual route is 800,000 THB in a Thai bank for 2 months before applying.',
    },
    cost: {
      amount: 5000,
      currency: 'THB',
      note: 'Each embassy sets its own fee. Oslo charges 2,000 NOK for multiple entry. 5,000 THB is the commonly quoted base fee but was not confirmed on a primary page.',
    },
    eligibility: {
      minAge: 50,
      minSavingsThb: 800000,
      remoteWorkAllowed: false,
      other: [
        'Money: 800,000 THB in the bank, or 65,000 THB a month in pension income, or a mix adding up to 800,000 THB a year.',
        'Health insurance covering your whole stay. Recent embassy pages ask for at least 3,000,000 THB (USD 100,000) in cover.',
        'Police certificate and medical certificate, each issued within the last 3 months.',
        'Any kind of employment is prohibited.',
      ],
    },
    documents: [
      'Passport valid for at least 18 months',
      'Proof of permanent residence in the country where you apply',
      'Photos taken within the last 6 months',
      'Bank statement (800,000 THB+) or pension letter (65,000 THB+ a month after tax)',
      'Police (criminal record) certificate, no older than 3 months',
      'Medical certificate (no leprosy, TB, elephantiasis, drug addiction or stage-3 syphilis), no older than 3 months',
      'Health insurance certificate on the embassy\'s Foreign Insurance Certificate form',
    ],
    steps: [
      'Check your embassy\'s O-A page. Requirements differ between embassies.',
      'Get your police and medical certificates (both expire after 3 months) and your insurance certificate.',
      'Apply through thaievisa.go.th or your embassy at least 15 working days before travel.',
      'Enter Thailand and file a 90-day report every 90 days.',
      'Before the year ends, extend at your local immigration office with proof that you still meet the money rules.',
    ],
    gotchas: [
      'Insurance conflict: the Oslo embassy (updated Sept 2026) asks for 3,000,000 THB in cover, while the Chicago consulate page (2023) lists 400,000 THB inpatient and 40,000 THB outpatient. Follow your embassy.',
      'Many people use a different route: enter on a 90-day Non-Immigrant O visa, then convert to a 1-year retirement extension inside Thailand (reported fee 1,900 THB).',
      'For in-country extensions, secondary sources say the 800,000 THB must sit in a Thai bank 2 months before you apply and 3 months after, and never drop below 400,000 THB. Ask your local office.',
      'You cannot work at all, not even remotely, on a retirement visa.',
      'Wealthy pensioners (USD 80,000+ passive income) should compare the 10-year LTR visa.',
    ],
    sources: [
      {
        label: 'Royal Thai Embassy, Oslo — Non-Immigrant O-A (updated 15 Sept 2026)',
        url: 'https://oslo.thaiembassy.org/en/page/non-immigrant-o-a-long-stay',
        tier: 'primary',
      },
      {
        label: 'Royal Thai Consulate-General, Chicago — O-A / O-X requirements',
        url: 'https://cgchicago.thaiembassy.org/en/page/visa-oaox',
        tier: 'primary',
      },
      {
        label: 'Thaiger — retirement visa and in-country extension',
        url: 'https://thethaiger.com/visas/retirement',
        tier: 'secondary',
      },
    ],
    verifiedAt: VERIFIED_ON,
  },
];

export const visaBySlug = (slug: VisaSlug): Visa => {
  const v = visas.find((x) => x.slug === slug);
  if (!v) throw new Error(`Unknown visa slug: ${slug}`);
  return v;
};
