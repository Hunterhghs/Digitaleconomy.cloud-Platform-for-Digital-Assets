# Supabase setup

The `migrations/` folder contains the schema, RLS policies, storage rules, and seed data for DigitalEconomy.cloud.

## If auth works but Settings says `public.profiles` is missing

Your Vercel app is pointing at a Supabase project where **SQL migrations were never applied**. The app cannot create tables from the browser — you must run the SQL once in the Supabase Dashboard.

**Fast path (paste once):**

1. Open Supabase → **SQL Editor** → **New query**.
2. Copy the entire contents of **`FULL_SETUP_RUN_ONCE.sql`** in this folder (same as all `migrations/*.sql` combined, in order).
3. Click **Run**. Wait until it finishes (~30 seconds).
4. Optional: **Settings → API → Restart project** so PostgREST reloads its schema cache.
5. Reload **https://digitaleconomy.cloud/settings** and save your profile again.

## Apply via the Supabase CLI (recommended for ongoing development)

```bash
# 1. Install the CLI
brew install supabase/tap/supabase   # or: npm install -g supabase

# 2. Login + link to your project
supabase login
supabase link --project-ref <your-project-ref>

# 3. Push every migration in order
supabase db push
```

## Apply via the SQL editor (manual, file by file)

Open Supabase → SQL Editor and paste each file in order:

1. `00001_init.sql`
2. `00002_rls.sql`
3. `00003_storage.sql`
4. `00004_seed.sql`
5. `00005_web3.sql` (optional if you use Web3 features)
6. `00006_profile_safety.sql`
7. `00007_view_count.sql`

## Auth providers

In **Supabase → Authentication → Providers** enable:

- **Email** (with confirmations)
- **Google** OAuth
- **GitHub** OAuth

Set the redirect URL in each provider to `https://<your-project-ref>.supabase.co/auth/v1/callback`, and set `Site URL` in **Authentication → URL Configuration** to your deployed origin (e.g. `https://digitaleconomy.cloud`). Add `http://localhost:3000` as an additional redirect URL for local dev.

## Promoting a moderator/admin

```sql
update public.profiles set role = 'admin' where handle = 'your-handle';
```
