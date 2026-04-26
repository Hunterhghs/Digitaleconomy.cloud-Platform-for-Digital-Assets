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
   - **Site URL**: `https://www.digitaleconomy.cloud` (must match the live origin you actually use; `www.` prefix matters)
   - **Additional redirect URLs** — paste all of these so links from email work no matter which domain you sent from:
     - `https://www.digitaleconomy.cloud/auth/callback`
     - `https://www.digitaleconomy.cloud/auth/confirm`
     - `https://www.digitaleconomy.cloud/auth/handle`
     - `https://digitaleconomy.cloud/auth/callback`
     - `https://digitaleconomy.cloud/auth/confirm`
     - `https://digitaleconomy.cloud/auth/handle`
     - `http://localhost:3000/auth/callback`
     - `http://localhost:3000/auth/confirm`
     - `http://localhost:3000/auth/handle`
5. **Authentication → Providers**: enable Email, Google, GitHub. For Google/GitHub create OAuth apps with the Supabase callback URL (shown in the Supabase UI).
6. **Authentication → Email Templates** — replace the action-button URL in the **Confirm signup** and **Reset password** templates with the modern token-hash links so we always get a server-readable token in the URL:

   **Confirm signup** template:

   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/dashboard">Confirm your email</a>
   ```

   **Reset password** template:

   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset your password</a>
   ```

   **Magic link** template (optional):

   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink&next=/dashboard">Sign in</a>
   ```

   The `/auth/callback` and `/auth/handle` routes also handle the legacy `?code=` and `#access_token=` formats, so older emails still work — but the templates above are the most reliable.
7. **Storage**: the migration creates the buckets, but verify `assets-original`, `assets-preview`, and `avatars` exist.

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

## 5. Email (Resend) — strongly recommended for production

Supabase's built-in email service has aggressive rate limits (a few emails per hour) and very low inbox-deliverability for free-mail providers like outlook.com, yahoo.com and gmail. If users are not receiving signup confirmations or password resets, this is almost always the cause. Wire up your own SMTP via Resend:

1. Sign up at <https://resend.com>, create an API key, add it as `RESEND_API_KEY`.
2. **Add and verify your sending domain** in Resend (e.g. `digitaleconomy.cloud`); add the SPF / DKIM / return-path DNS records they generate.
3. In Supabase → **Project Settings → Authentication → SMTP Settings**, toggle **Enable Custom SMTP** and enter:
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: your Resend API key
   - Sender email: e.g. `no-reply@digitaleconomy.cloud`
   - Sender name: `DigitalEconomy.cloud`
4. Click **Save**, then under **Authentication → Users**, hit **Send test email** to confirm delivery.

Until custom SMTP is wired, you can still verify the auth flow end-to-end by manually confirming a user in Supabase **Authentication → Users → ⋯ → Confirm email**.

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

## 10. Troubleshooting auth

**Confirmation / reset emails never arrive.**
1. Check Supabase **Authentication → Logs** for the email send attempt. If the log shows "rate limited", you have hit the free SMTP cap — wire up Resend SMTP (see §5).
2. Check the user's spam / junk folder. Outlook in particular often quarantines mail from Supabase's default sender.
3. While debugging, manually confirm the user via Supabase **Authentication → Users → ⋯ → Confirm email** to validate the rest of the flow works.

**Reset password link drops me on the home page.**
1. Make sure Supabase **Site URL** is set to your live origin (`https://www.digitaleconomy.cloud`), not `localhost:3000`. Old emails minted with the wrong Site URL will keep going to the wrong place forever — request a new reset email after fixing it.
2. Make sure Vercel env var `NEXT_PUBLIC_SITE_URL` matches the same origin and that you redeployed after changing it.
3. Make sure all three of `/auth/callback`, `/auth/confirm`, and `/auth/handle` are listed under Supabase **Authentication → URL Configuration → Redirect URLs** (see §1).
4. Update Supabase email templates to use the `/auth/confirm?token_hash=...` pattern shown in §1, step 6.

**`/login?error=callback`.**
This means Supabase couldn't validate the link (expired, already used, or the PKCE `code_verifier` cookie was missing because the user clicked the email on a different browser than they requested it from). Have the user request a new link.

**Account creation emails contain `localhost:3000` links.**
Supabase Site URL is still set to `localhost:3000`. Update it (Authentication → URL Configuration), redeploy with the correct `NEXT_PUBLIC_SITE_URL`, and ask the user to retry signup so a fresh email is generated.
