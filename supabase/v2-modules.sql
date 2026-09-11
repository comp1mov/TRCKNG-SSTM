-- Apply after v2-isolation.sql. Supports modular journals; v1/RLS/grants are unchanged.
-- One transaction prevents any interval without the format check.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
alter table public.trckng_v2_snapshots
  drop constraint trckng_v2_snapshots_app_state_check,
  add constraint trckng_v2_snapshots_app_state_check check (
    coalesce(app_state->>'dataset' = 'sstm-v2'
      and app_state->>'dataVersion' in ('1', '2'), false)
  );
commit;
