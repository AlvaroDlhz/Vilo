-- =============================================
-- Vilo - Historial de reproduccion (watch history)
-- Ejecuta este script en Supabase SQL Editor
-- =============================================

create table if not exists public.watch_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references public.user_videos(id) on delete cascade,
  watched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

create index if not exists watch_history_user_watched_idx
  on public.watch_history (user_id, watched_at desc);

alter table public.watch_history enable row level security;

drop policy if exists "Users read own watch history" on public.watch_history;
drop policy if exists "Users insert own watch history" on public.watch_history;
drop policy if exists "Users update own watch history" on public.watch_history;
drop policy if exists "Users delete own watch history" on public.watch_history;

create policy "Users read own watch history"
  on public.watch_history
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own watch history"
  on public.watch_history
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own watch history"
  on public.watch_history
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own watch history"
  on public.watch_history
  for delete
  to authenticated
  using (auth.uid() = user_id);

