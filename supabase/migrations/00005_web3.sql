-- =====================================================================
-- DigitalEconomy.cloud — Phase 2 Web3 schema
-- Wallet linking (SIWE) + on-chain mint records.
-- This migration is forward-compatible with the MVP: nothing here is
-- required for the core upload/download flows.
-- =====================================================================

-- ---------- siwe nonces ----------
-- Short-lived, single-use nonces issued by GET /api/web3/siwe/nonce
-- and consumed by POST /api/web3/siwe/verify.
create table if not exists public.siwe_nonces (
  nonce        text primary key,
  address      citext,                 -- optional: bind to address before verify
  issued_at    timestamptz not null default now(),
  expires_at   timestamptz not null,
  consumed_at  timestamptz
);

create index if not exists siwe_nonces_expires_idx
  on public.siwe_nonces (expires_at);

-- Periodically prune expired nonces. (Call via pg_cron or a Supabase scheduled function.)
create or replace function public.prune_siwe_nonces()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.siwe_nonces where expires_at < now() - interval '1 hour';
$$;

-- ---------- linked wallets ----------
-- A user may link one or more wallets. The `is_primary` flag identifies the
-- default wallet used for mints and on-chain attribution.
create table if not exists public.wallets (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  address         citext not null,             -- 0x-prefixed checksum lowercased
  chain_id        integer not null,            -- EVM chain id (1, 137, 8453, …)
  is_primary      boolean not null default false,
  verified_at     timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique (address, chain_id)
);

create index if not exists wallets_user_idx on public.wallets (user_id);

-- One primary wallet per user.
create unique index if not exists wallets_user_primary_unique
  on public.wallets (user_id)
  where is_primary;

-- ---------- mint records ----------
-- Records of NFT mints associated with an asset. The actual on-chain mint is
-- triggered client-side; this table stores the resulting tx + token metadata
-- so we can render "Minted as NFT" badges and link to block explorers.
create table if not exists public.mints (
  id              uuid primary key default uuid_generate_v4(),
  asset_id        uuid not null references public.assets(id) on delete cascade,
  owner_id        uuid not null references public.profiles(id) on delete cascade,
  wallet_id       uuid references public.wallets(id) on delete set null,
  chain_id        integer not null,
  contract_address citext not null,
  token_id        text not null,               -- big int as text to avoid overflow
  tx_hash         citext not null,
  metadata_uri    text,                        -- ipfs:// or https:// JSON metadata
  block_number    bigint,
  minted_at       timestamptz not null default now(),
  unique (chain_id, contract_address, token_id)
);

create index if not exists mints_asset_idx on public.mints (asset_id);
create index if not exists mints_owner_idx on public.mints (owner_id);

-- ---------- RLS ----------
alter table public.siwe_nonces enable row level security;
alter table public.wallets     enable row level security;
alter table public.mints       enable row level security;

-- Nonces: never readable from the client. All access goes through service role.
-- (No policies = deny all for anon/authenticated, allow for service_role.)

-- Wallets: a user can read & manage their own wallets; public can read addresses
-- attached to a profile (so we can show "verified by 0x…" on profile pages).
create policy "wallets are publicly readable" on public.wallets
  for select using (true);

create policy "users manage their own wallets" on public.wallets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Mints: publicly readable (so asset pages can show on-chain badges); only the
-- owner (or staff via service role) can insert/delete.
create policy "mints are publicly readable" on public.mints
  for select using (true);

create policy "owners can record their mints" on public.mints
  for insert with check (auth.uid() = owner_id);

create policy "owners can delete their mints" on public.mints
  for delete using (auth.uid() = owner_id);
