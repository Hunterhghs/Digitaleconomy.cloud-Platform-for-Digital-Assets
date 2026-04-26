# Deployment Guide — DigitalEconomy.cloud

This walks through getting the app onto a live `digitaleconomy.cloud` domain via GitHub + Vercel + Supabase. Plan ~30–60 minutes for a first run.

## 1. Create the Supabase project

1. Go to <https://supabase.com> → New project. Region: closest to your audience (e.g., `us-east-1`).
2. Once provisioned, open **Project Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only; never ship to the browser)
3. Run the migrations in `supabase/migrations/` (in order). See `supabase/README.md`.
4. **Authentication → URL Configuration**:
   - Site URL: `https://digitaleconomy.cloud`
   - Additional redirect URLs: `https://digitaleconomy.cloud/auth/callback`, `http://localhost:3000/auth/callback`
5. **Authentication → Providers**: enable Email, Google, GitHub. For Google/GitHub create OAuth apps with the Supabase callback URL (shown in the Supabase UI).
6. **Storage**: the migration creates the buckets, but verify `assets-original`, `assets-preview`, and `avatars` exist.

## 2. Push to GitHub

```bash
cd "DigitalEconomy.cloud Platform"
git init
git add .
git commit -m "feat: initial DigitalEconomy.cloud platform"
git branch -M main
gh repo create digitaleconomy.cloud --public --source=. --remote=origin --push
# (or: create the repo on github.com and follow the displayed instructions)
```

## 3. Deploy to Vercel

1. Go to <https://vercel.com/new>, import the GitHub repo.
2. Framework preset: **Next.js** (auto-detected).
3. Set environment variables (Production + Preview + Development) from `.env.example`:
   - `NEXT_PUBLIC_SITE_URL=https://digitaleconomy.cloud`
   - `NEXT_PUBLIC_SITE_NAME=DigitalEconomy.cloud`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY` (optional)
   - `NEXT_PUBLIC_SENTRY_DSN` (optional)
4. Click **Deploy**.

## 4. Attach the custom domain

1. In Vercel → Project → **Settings → Domains**, add `digitaleconomy.cloud` and `www.digitaleconomy.cloud`.
2. Vercel will show DNS records to add at your registrar:
   - `A` for the apex domain → Vercel's IP
   - `CNAME` for `www` → `cname.vercel-dns.com`
3. Wait for SSL to provision (~1–5 minutes).
4. Update Supabase **Site URL** if you changed it.

## 5. Email (Resend) — optional but recommended

1. Sign up at <https://resend.com>, create an API key, add it as `RESEND_API_KEY`.
2. **Add and verify your domain** in Resend; add the SPF/DKIM/return-path records at your DNS provider.
3. Set Supabase **Authentication → Email Templates** to use a custom SMTP that points to Resend, OR keep Supabase's built-in email for the MVP.

## 6. Observability — optional

- Enable **Vercel Analytics** and **Speed Insights** from the Vercel project dashboard (one click each).
- Sentry: create an org/project and set `NEXT_PUBLIC_SENTRY_DSN`. We can add the Sentry SDK in a follow-up.

## 7. Promote your moderator account

After signing up for the first time, run this in Supabase SQL Editor:

```sql
update public.profiles set role = 'admin' where handle = 'your-handle';
```

## 8. (Optional) Enable Phase 2 Web3

Web3 features (wallet linking + on-chain mint badges) are gated behind a feature flag and are off by default.

1. In Vercel → Project → **Settings → Environment Variables** add:
   - `NEXT_PUBLIC_ENABLE_WEB3=true`
   - `NEXT_PUBLIC_WEB3_CHAIN=base-sepolia` (or `base`, `polygon`, `polygon-amoy`, `ethereum`, `sepolia`)
2. Apply the Web3 schema to Supabase: run `supabase/migrations/00005_web3.sql`.
3. Redeploy. The **Wallets** card appears in `/settings`, and the asset edit page shows a **Record on-chain mint** dialog.
4. To go fully wallet-first later, add `wagmi` + `RainbowKit` and replace the `<WalletConnectButton>` component — the SIWE nonce/verify routes already do all the server work.

## 9. Post-deploy checklist

- [ ] Sign up with email; confirm the verification flow works.
- [ ] Sign in with Google and GitHub.
- [ ] Upload a test image; confirm the thumbnail renders.
- [ ] Download the test asset; confirm `download_count` increments.
- [ ] Like the asset; confirm `like_count` updates.
- [ ] File a report; confirm it appears in `/admin`.
- [ ] Confirm `/sitemap.xml` and `/robots.txt` resolve.
- [ ] Confirm `/opengraph-image` returns a PNG (preview an asset on Twitter/Slack).
