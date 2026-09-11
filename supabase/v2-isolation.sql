-- Additive setup for the personal v2 pilot. No v1 table or record is changed.
begin;
create table if not exists public.trckng_v2_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null check (revision > 0),
  app_state jsonb not null check (coalesce(app_state->>'dataset' = 'sstm-v2' and app_state->>'dataVersion' = '1', false)),
  source_state jsonb,
  source_updated_at timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  device_id text not null,
  write_id uuid not null
);
alter table public.trckng_v2_snapshots enable row level security;
revoke all on public.trckng_v2_snapshots from anon, authenticated;
grant select, insert on public.trckng_v2_snapshots to authenticated;
grant update (revision, app_state, updated_at, device_id, write_id) on public.trckng_v2_snapshots to authenticated;
create policy "v2_select_own" on public.trckng_v2_snapshots for select to authenticated using ((select auth.uid()) = user_id);
create policy "v2_insert_own" on public.trckng_v2_snapshots for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "v2_update_own" on public.trckng_v2_snapshots for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function public.commit_trckng_v2(
  expected_revision bigint, state jsonb, device text, mutation_id uuid,
  source jsonb default null, source_at timestamptz default null
) returns table(revision bigint, updated_at timestamptz, device_id text, write_id uuid)
language plpgsql security invoker set search_path = '' as $$
declare saved public.trckng_v2_snapshots;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if expected_revision = 0 then
    insert into public.trckng_v2_snapshots(user_id, revision, app_state, source_state, source_updated_at, device_id, write_id)
      values(auth.uid(), 1, state, source, source_at, device, mutation_id)
      on conflict (user_id) do nothing returning * into saved;
  else
    update public.trckng_v2_snapshots t
      set app_state = state, revision = t.revision + 1, updated_at = clock_timestamp(), device_id = device, write_id = mutation_id
      where t.user_id = auth.uid() and t.revision = expected_revision returning * into saved;
  end if;
  if saved.user_id is null then
    select * into saved from public.trckng_v2_snapshots t where t.user_id = auth.uid() and t.write_id = mutation_id;
    if saved.user_id is null then raise exception 'V2 revision conflict' using errcode = '40001'; end if;
  end if;
  return query select saved.revision, saved.updated_at, saved.device_id, saved.write_id;
end;
$$;
revoke all on function public.commit_trckng_v2(bigint,jsonb,text,uuid,jsonb,timestamptz) from public, anon;
grant execute on function public.commit_trckng_v2(bigint,jsonb,text,uuid,jsonb,timestamptz) to authenticated;
commit;
