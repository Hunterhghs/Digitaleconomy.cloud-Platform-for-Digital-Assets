# DigitalEconomy.cloud

A nonprofit commons for creating, owning, and freely sharing digital assets.

- **Free to list. Free to download. Always.**
- Creators retain attribution and ownership of what they upload.
- Built as a community resource — open code, transparent operations.

## Stack

- **Next.js 15** (App Router, React 19, TypeScript)
- **Tailwind CSS v4** + **shadcn/ui** + lucide-react
- **Supabase** — Postgres, Auth (email + Google + GitHub), Storage, Row Level Security
- **Resend** for transactional email
- **Vercel** for hosting (with GitHub PR previews)

## Quick start

```bash
# 1. Install
npm install

# 2. Configure env
cp .env.example .env.local
# fill in your Supabase + Resend keys

# 3. Run the database migrations
#    Either in the Supabase SQL editor (paste files in order),
#    or via the Supabase CLI:
supabase db push

# 4. Start the dev server
npm run dev
# → http://localhost:3000
```

## Project layout

```
src/
  app/             # App Router pages, route handlers, server actions
  components/      # Reusable UI (shadcn primitives + product components)
  lib/
    supabase/      # Browser, server, and middleware Supabase clients
    validators/    # Zod schemas
    types/         # Generated DB types
supabase/
  migrations/      # SQL migrations (schema, RLS, seed)
.github/
  workflows/       # CI: lint, typecheck, build
```

## Scripts

| Command            | Purpose                                |
| ------------------ | -------------------------------------- |
| `npm run dev`      | Local dev server (Turbopack)           |
| `npm run build`    | Production build                       |
| `npm run start`    | Run production build                   |
| `npm run lint`     | ESLint                                 |
| `npm run typecheck`| `tsc --noEmit`                         |
| `npm run format`   | Prettier write                         |

## Deployment

The app is designed to deploy on **Vercel** with zero config:

1. Push this repo to GitHub.
2. Import it into Vercel.
3. Set the same env vars from `.env.example` in Vercel → Settings → Environment Variables.
4. Attach `digitaleconomy.cloud` as the production domain.

## Roadmap

- **Phase 1 (MVP)** — accounts, upload, discovery, downloads, profiles, moderation. ✅ scaffolded.
- **Phase 2** — wallet linking (SIWE), optional NFT minting, public API.

## License

Code is released under the MIT License. Uploaded asset content is owned by individual creators under the license they choose at upload time.
