-- =============================================
-- Vilo - Saved lists ("Guardados")
-- Ejecuta este script en Supabase SQL Editor
-- =============================================

create extension if not exists pgcrypto;

-- -----------------------------
-- Tables
-- -----------------------------
create table if not exists public.saved_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, name)
);

create unique index if not exists saved_lists_one_default_per_user_idx
  on public.saved_lists(user_id)
  where is_default = true;

create index if not exists saved_lists_user_updated_idx
  on public.saved_lists (user_id, updated_at desc);

create table if not exists public.saved_list_items (
  list_id uuid not null,
  user_id uuid not null,
  video_id text not null check (char_length(btrim(video_id)) > 0),
  created_at timestamptz not null default now(),
  primary key (list_id, video_id),
  constraint saved_list_items_list_owner_fk
    foreign key (list_id, user_id)
    references public.saved_lists(id, user_id)
    on delete cascade
);

create index if not exists saved_list_items_user_created_idx
  on public.saved_list_items (user_id, created_at desc);

-- -----------------------------
-- Triggers
-- -----------------------------
create or replace function public.saved_lists_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists saved_lists_set_updated_at_tg on public.saved_lists;
create trigger saved_lists_set_updated_at_tg
  before update on public.saved_lists
  for each row execute function public.saved_lists_set_updated_at();

create or replace function public.saved_list_items_touch_list()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.saved_lists
      set updated_at = now()
      where id = new.list_id and user_id = new.user_id;
    return new;
  end if;

  update public.saved_lists
    set updated_at = now()
    where id = old.list_id and user_id = old.user_id;
  return old;
end;
$$;

drop trigger if exists saved_list_items_touch_list_tg on public.saved_list_items;
create trigger saved_list_items_touch_list_tg
  after insert or delete on public.saved_list_items
  for each row execute function public.saved_list_items_touch_list();

-- -----------------------------
-- RLS
-- -----------------------------
alter table public.saved_lists enable row level security;
alter table public.saved_list_items enable row level security;

drop policy if exists "Users read own saved_lists" on public.saved_lists;
drop policy if exists "Users insert own saved_lists" on public.saved_lists;
drop policy if exists "Users update own saved_lists" on public.saved_lists;
drop policy if exists "Users delete own saved_lists" on public.saved_lists;

create policy "Users read own saved_lists"
  on public.saved_lists
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own saved_lists"
  on public.saved_lists
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own saved_lists"
  on public.saved_lists
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own saved_lists"
  on public.saved_lists
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users read own saved_list_items" on public.saved_list_items;
drop policy if exists "Users insert own saved_list_items" on public.saved_list_items;
drop policy if exists "Users delete own saved_list_items" on public.saved_list_items;

create policy "Users read own saved_list_items"
  on public.saved_list_items
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own saved_list_items"
  on public.saved_list_items
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users delete own saved_list_items"
  on public.saved_list_items
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- -----------------------------
-- Helpers / RPC
-- -----------------------------
create or replace function public.ensure_default_saved_list(p_user_id uuid default auth.uid())
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_list_id uuid;
begin
  if p_user_id is null then
    raise exception 'User not authenticated';
  end if;

  select id into v_list_id
  from public.saved_lists
  where user_id = p_user_id and is_default = true
  order by created_at asc
  limit 1;

  if v_list_id is null then
    select id into v_list_id
    from public.saved_lists
    where user_id = p_user_id and name = 'Guardados'
    order by created_at asc
    limit 1;

    if v_list_id is null then
      insert into public.saved_lists (user_id, name, is_default)
      values (p_user_id, 'Guardados', true)
      returning id into v_list_id;
    else
      update public.saved_lists
      set is_default = true, updated_at = now()
      where id = v_list_id and user_id = p_user_id;
    end if;
  end if;

  update public.saved_lists
  set is_default = false
  where user_id = p_user_id and id <> v_list_id and is_default = true;

  return v_list_id;
end;
$$;

revoke all on function public.ensure_default_saved_list(uuid) from public;
grant execute on function public.ensure_default_saved_list(uuid) to authenticated;

create or replace function public.get_saved_lists()
returns table (
  id uuid,
  name text,
  is_default boolean,
  video_ids text[],
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with me as (
    select auth.uid() as uid
  )
  select
    l.id,
    l.name,
    l.is_default,
    coalesce(
      array_agg(i.video_id order by i.created_at desc)
      filter (where i.video_id is not null),
      '{}'::text[]
    ) as video_ids,
    l.created_at,
    l.updated_at
  from public.saved_lists l
  left join public.saved_list_items i
    on i.list_id = l.id and i.user_id = l.user_id
  join me on me.uid = l.user_id
  group by l.id, l.name, l.is_default, l.created_at, l.updated_at
  order by case when l.is_default then 0 else 1 end, l.updated_at desc;
$$;

revoke all on function public.get_saved_lists() from public;
grant execute on function public.get_saved_lists() to authenticated;

create or replace function public.create_saved_list(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_list_id uuid;
begin
  if v_user_id is null then
    raise exception 'User not authenticated';
  end if;
  if char_length(v_name) = 0 then
    raise exception 'List name is required';
  end if;

  insert into public.saved_lists (user_id, name, is_default)
  values (v_user_id, v_name, false)
  on conflict (user_id, name)
  do update set updated_at = now()
  returning id into v_list_id;

  return v_list_id;
end;
$$;

revoke all on function public.create_saved_list(text) from public;
grant execute on function public.create_saved_list(text) to authenticated;

create or replace function public.save_video_to_list(p_video_id text, p_list_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_list_id uuid := p_list_id;
  v_video_id text := btrim(coalesce(p_video_id, ''));
begin
  if v_user_id is null then
    raise exception 'User not authenticated';
  end if;
  if char_length(v_video_id) = 0 then
    raise exception 'video_id is required';
  end if;

  if v_list_id is null then
    v_list_id := public.ensure_default_saved_list(v_user_id);
  end if;

  if not exists (
    select 1
    from public.saved_lists
    where id = v_list_id and user_id = v_user_id
  ) then
    raise exception 'List not found';
  end if;

  insert into public.saved_list_items (list_id, user_id, video_id)
  values (v_list_id, v_user_id, v_video_id)
  on conflict (list_id, video_id) do nothing;

  update public.saved_lists
  set updated_at = now()
  where id = v_list_id and user_id = v_user_id;

  return v_list_id;
end;
$$;

revoke all on function public.save_video_to_list(text, uuid) from public;
grant execute on function public.save_video_to_list(text, uuid) to authenticated;

create or replace function public.remove_video_from_list(p_video_id text, p_list_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_video_id text := btrim(coalesce(p_video_id, ''));
begin
  if v_user_id is null then
    raise exception 'User not authenticated';
  end if;
  if p_list_id is null then
    raise exception 'list_id is required';
  end if;
  if char_length(v_video_id) = 0 then
    return;
  end if;

  delete from public.saved_list_items
  where list_id = p_list_id and user_id = v_user_id and video_id = v_video_id;

  update public.saved_lists
  set updated_at = now()
  where id = p_list_id and user_id = v_user_id;
end;
$$;

revoke all on function public.remove_video_from_list(text, uuid) from public;
grant execute on function public.remove_video_from_list(text, uuid) to authenticated;

create or replace function public.delete_saved_list(p_list_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_default boolean;
begin
  if v_user_id is null then
    raise exception 'User not authenticated';
  end if;
  if p_list_id is null then
    return;
  end if;

  select is_default into v_is_default
  from public.saved_lists
  where id = p_list_id and user_id = v_user_id;

  if v_is_default is null then
    return;
  end if;

  if v_is_default then
    raise exception 'Cannot delete default list';
  end if;

  delete from public.saved_lists
  where id = p_list_id and user_id = v_user_id;
end;
$$;

revoke all on function public.delete_saved_list(uuid) from public;
grant execute on function public.delete_saved_list(uuid) to authenticated;

-- -----------------------------
-- Auto-create default list on signup
-- -----------------------------
create or replace function public.handle_new_user_saved_lists()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_default_saved_list(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_saved_lists on auth.users;
create trigger on_auth_user_created_saved_lists
  after insert on auth.users
  for each row execute function public.handle_new_user_saved_lists();

-- Backfill for existing users
do $$
declare
  r record;
begin
  for r in select id from auth.users loop
    perform public.ensure_default_saved_list(r.id);
  end loop;
end;
$$;
