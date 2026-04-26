-- =====================================================================
-- View count RPC
--
-- The asset detail page bumps `view_count` on every render. Anonymous
-- and non-owner users cannot UPDATE assets directly under the existing
-- RLS policy, so a SECURITY DEFINER RPC is needed to record views.
-- =====================================================================

create or replace function public.increment_view_count(p_asset_id uuid)
returns int
language plpgsql
security definer
set search_path = public as $$
declare
  v_count int;
begin
  update public.assets
     set view_count = view_count + 1
   where id = p_asset_id and status = 'published'
  returning view_count into v_count;
  return coalesce(v_count, 0);
end;
$$;

grant execute on function public.increment_view_count(uuid) to anon, authenticated;
