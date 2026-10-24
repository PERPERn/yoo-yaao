# Yoo Yaao

An English PWA that helps digital nomads and long-stay foreigners stay in Thailand legally and easily. Built for the All for One University competition.

**Live site:** https://yoo-yaao.vercel.app

The site has three sides:

- **Travellers:** visa finder, visa guides, stay tools and Local Buddies.
- **Businesses:** a separate business area at `/business` and a partner portal at `/partner`.
- **Admin:** a dashboard at `/admin`.

## Stack

Astro 7 (static output plus API routes on Vercel), Supabase (Postgres, Auth, RLS, Realtime), Stripe, GSAP and three.js.

## Run locally

```bash
cd app
cp .env.example .env   # fill in your own values; never commit .env
npm install
npm run dev            # http://localhost:4321
```

Without Supabase or Stripe keys the site still runs: business, partner, admin and payment pages switch to a clearly labelled demo mode.

## Layout

| Path | What |
|---|---|
| `app/` | The website: Astro pages, components and API routes |
| `supabase/migrations/` | Database schema and RLS policies |
| `docs/` | Design, business model, security notes and the pitch |
| `research/` | Market and customer research |
| `blender/` | Source file for the 3D hero model |

The setup checklist and summary in Thai are in `docs/สรุปและสิ่งที่ต้องตั้งค่า-TH.md`.
