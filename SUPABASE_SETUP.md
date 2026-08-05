# Supabase Setup for TRCKNG SSTM

TRCKNG SSTM v1.31 uses Supabase as an optional cloud layer. The app stays local-first: without Supabase config it continues to store everything in browser `localStorage`.

## 1. Create Project

This project is currently configured in `app-config.js` with:

- Project URL: `https://vsabgctziegbtbpqyurb.supabase.co`
- Publishable key: `sb_publishable_2Rl6uyW5XySFQ8SvwZkKcw_k3t_CAr0`

You can still override these values in the app: open `ACCOUNT`, paste different values, and press `SAVE CONFIG`.

The Supabase dashboard may suggest `npm install @supabase/supabase-js @supabase/ssr` for Next.js. TRCKNG SSTM v1.31 is still a static app, so it uses the browser CDN build of `@supabase/supabase-js@2`; `@supabase/ssr` is not needed until the project moves to a server-rendered framework.

If email confirmation is enabled, open Supabase `Authentication -> URL Configuration` and add the app URLs you use as allowed redirect URLs, for example:

- `http://127.0.0.1:5173/TRCKNG-SSTM/`
- `http://YOUR-LAN-IP:5173/TRCKNG-SSTM/`
- your final GitHub Pages / production URL

## 2. Create Snapshot Table

Run this SQL in the Supabase SQL editor:

```sql
create table if not exists public.trckng_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  app_state jsonb not null,
  updated_at timestamptz not null default now(),
  device_id text,
  created_at timestamptz not null default now()
);

alter table public.trckng_snapshots enable row level security;

drop policy if exists "TRCKNG snapshots select own row" on public.trckng_snapshots;
drop policy if exists "TRCKNG snapshots insert own row" on public.trckng_snapshots;
drop policy if exists "TRCKNG snapshots update own row" on public.trckng_snapshots;
drop policy if exists "TRCKNG snapshots delete own row" on public.trckng_snapshots;

create policy "TRCKNG snapshots select own row"
on public.trckng_snapshots
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "TRCKNG snapshots insert own row"
on public.trckng_snapshots
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "TRCKNG snapshots update own row"
on public.trckng_snapshots
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "TRCKNG snapshots delete own row"
on public.trckng_snapshots
for delete
to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on table public.trckng_snapshots to authenticated;
```

## 3. First Sync

1. Sign up or sign in from `ACCOUNT`.
2. Press `UPLOAD THIS DEVICE` on the device that has the correct local data.
3. On another device, sign in and press `LOAD CLOUD`.

v1.31 keeps manual sync controls, but signed-in local changes are now queued for debounced autosync. Conflict handling remains conservative: cloud updates are not allowed to silently overwrite local unsaved changes.
