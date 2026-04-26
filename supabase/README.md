# Supabase setup

The `migrations/` folder contains the schema, RLS policies, storage rules, and seed data for DigitalEconomy.cloud.

## Apply via the Supabase CLI (recommended)

```bash
# 1. Install the CLI
brew install supabase/tap/supabase   # or: npm install -g supabase

# 2. Login + link to your project
supabase login
supabase link --project-ref <your-project-ref>

# 3. Push every migration in order
supabase db push
```

## Apply via the SQL editor (manual)

Open Supabase → SQL Editor and paste each file in order:

1. `00001_init.sql`
2. `00002_rls.sql`
3. `00003_storage.sql`
4. `00004_seed.sql`

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
