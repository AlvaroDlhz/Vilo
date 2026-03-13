-- =============================================
-- Vilo: Schema for channels and videos
-- Run this in the Supabase SQL Editor
-- =============================================

-- Channels table
create table if not exists channels (
  id text primary key,
  name text not null,
  subscribers text,
  description text,
  joined_date text,
  total_views text,
  location text,
  banner_gradient_index int default 0,
  links jsonb default '[]'::jsonb,
  playlists jsonb default '[]'::jsonb,
  posts jsonb default '[]'::jsonb
);

-- Videos table
create table if not exists videos (
  id text primary key,
  title text not null,
  channel_id text references channels(id),
  channel_name text,
  views text,
  uploaded_at text,
  duration text,
  gradient_index int default 0,
  description text,
  subscribers text,
  likes text,
  dislikes text,
  published_date text
);

-- Profiles table (linked to auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  username text unique,
  birth_date date,
  bio text,
  interests text[] default '{}',
  avatar_url text,
  banner_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trigger: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, username, birth_date, bio, interests)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', ''),
    coalesce(new.raw_user_meta_data->>'username', ''),
    case
      when new.raw_user_meta_data->>'birth_date' is not null
        and new.raw_user_meta_data->>'birth_date' != ''
      then (new.raw_user_meta_data->>'birth_date')::date
      else null
    end,
    coalesce(new.raw_user_meta_data->>'bio', ''),
    case
      when new.raw_user_meta_data->'interests' is not null
      then array(select jsonb_array_elements_text(new.raw_user_meta_data->'interests'))
      else '{}'
    end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Enable RLS
alter table channels enable row level security;
alter table videos enable row level security;
alter table profiles enable row level security;

-- Public read access (anon can read everything)
create policy "Public read access on channels"
  on channels for select
  to anon
  using (true);

create policy "Public read access on videos"
  on videos for select
  to anon
  using (true);

-- Profiles RLS
create policy "Public read access on profiles"
  on profiles for select
  using (true);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- Storage buckets
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('banners', 'banners', true) on conflict do nothing;

-- =============================================
-- Comments
-- =============================================

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  video_id text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  parent_id uuid references comments(id) on delete cascade,
  text text not null,
  likes int default 0,
  dislikes int default 0,
  created_at timestamptz default now()
);

-- Migration: add parent_id if table already exists
alter table comments add column if not exists parent_id uuid references comments(id) on delete cascade;

create table if not exists comment_votes (
  comment_id uuid references comments(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  vote smallint not null check (vote in (1, -1)),
  primary key (comment_id, user_id)
);

alter table comments enable row level security;
alter table comment_votes enable row level security;

-- Comments RLS
create policy "Public read comments"
  on comments for select
  using (true);

create policy "Auth users insert comments"
  on comments for insert
  with check (auth.uid() = user_id);

create policy "Owner update comments"
  on comments for update
  using (auth.uid() = user_id);

create policy "Owner delete comments"
  on comments for delete
  using (auth.uid() = user_id);

-- Comment votes RLS
create policy "Public read comment_votes"
  on comment_votes for select
  using (true);

create policy "Auth users insert comment_votes"
  on comment_votes for insert
  with check (auth.uid() = user_id);

create policy "Auth users update comment_votes"
  on comment_votes for update
  using (auth.uid() = user_id);

create policy "Auth users delete comment_votes"
  on comment_votes for delete
  using (auth.uid() = user_id);

-- Function to update comment vote counts
create or replace function update_comment_votes()
returns trigger
language plpgsql
security definer
as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.vote = 1 then
      update comments set likes = likes + 1 where id = NEW.comment_id;
    else
      update comments set dislikes = dislikes + 1 where id = NEW.comment_id;
    end if;
    return NEW;
  elsif TG_OP = 'UPDATE' then
    -- Remove old vote
    if OLD.vote = 1 then
      update comments set likes = likes - 1 where id = OLD.comment_id;
    else
      update comments set dislikes = dislikes - 1 where id = OLD.comment_id;
    end if;
    -- Add new vote
    if NEW.vote = 1 then
      update comments set likes = likes + 1 where id = NEW.comment_id;
    else
      update comments set dislikes = dislikes + 1 where id = NEW.comment_id;
    end if;
    return NEW;
  elsif TG_OP = 'DELETE' then
    if OLD.vote = 1 then
      update comments set likes = likes - 1 where id = OLD.comment_id;
    else
      update comments set dislikes = dislikes - 1 where id = OLD.comment_id;
    end if;
    return OLD;
  end if;
end;
$$;

create trigger on_comment_vote_change
  after insert or update or delete on comment_votes
  for each row execute function update_comment_votes();

-- Storage policies: public read
create policy "Public read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Public read banners"
  on storage.objects for select
  using (bucket_id = 'banners');

-- Storage policies: authenticated upload to own folder
create policy "Auth users upload avatars"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Auth users update avatars"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Auth users upload banners"
  on storage.objects for insert
  with check (
    bucket_id = 'banners'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Auth users update banners"
  on storage.objects for update
  using (
    bucket_id = 'banners'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================
-- User-uploaded videos
-- =============================================

create table if not exists user_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  title text not null,
  description text,
  video_url text,
  thumbnail_url text,
  tags text[] default '{}',
  category text,
  visibility text default 'public' check (visibility in ('public', 'unlisted', 'private')),
  scheduled_at timestamptz,
  language text,
  license text default 'standard',
  comments_enabled boolean default true,
  audience text default 'all',
  location text,
  collaborators text[] default '{}',
  subtitle_url text,
  subtitle_language text,
  status text default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table user_videos enable row level security;

create policy "Public read published user_videos"
  on user_videos for select
  using (visibility = 'public' and status = 'published');

create policy "Owner read own user_videos"
  on user_videos for select
  using (auth.uid() = user_id);

create policy "Owner insert user_videos"
  on user_videos for insert
  with check (auth.uid() = user_id);

create policy "Owner update user_videos"
  on user_videos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Owner delete user_videos"
  on user_videos for delete
  using (auth.uid() = user_id);

-- Columns for video interaction counters
alter table user_videos add column if not exists view_count int default 0;
alter table user_videos add column if not exists likes int default 0;
alter table user_videos add column if not exists dislikes int default 0;

-- Video votes table
create table if not exists video_votes (
  video_id uuid references user_videos(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  vote smallint not null check (vote in (1, -1)),
  primary key (video_id, user_id)
);

alter table video_votes enable row level security;

-- Video votes RLS
create policy "Public read video_votes"
  on video_votes for select
  using (true);

create policy "Auth users insert video_votes"
  on video_votes for insert
  with check (auth.uid() = user_id);

create policy "Auth users update video_votes"
  on video_votes for update
  using (auth.uid() = user_id);

create policy "Auth users delete video_votes"
  on video_votes for delete
  using (auth.uid() = user_id);

-- Trigger to update video like/dislike counts
create or replace function update_video_votes()
returns trigger
language plpgsql
security definer
as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.vote = 1 then
      update user_videos set likes = likes + 1 where id = NEW.video_id;
    else
      update user_videos set dislikes = dislikes + 1 where id = NEW.video_id;
    end if;
    return NEW;
  elsif TG_OP = 'UPDATE' then
    if OLD.vote = 1 then
      update user_videos set likes = likes - 1 where id = OLD.video_id;
    else
      update user_videos set dislikes = dislikes - 1 where id = OLD.video_id;
    end if;
    if NEW.vote = 1 then
      update user_videos set likes = likes + 1 where id = NEW.video_id;
    else
      update user_videos set dislikes = dislikes + 1 where id = NEW.video_id;
    end if;
    return NEW;
  elsif TG_OP = 'DELETE' then
    if OLD.vote = 1 then
      update user_videos set likes = likes - 1 where id = OLD.video_id;
    else
      update user_videos set dislikes = dislikes - 1 where id = OLD.video_id;
    end if;
    return OLD;
  end if;
end;
$$;

create trigger on_video_vote_change
  after insert or update or delete on video_votes
  for each row execute function update_video_votes();

-- RPC to increment video views
create or replace function increment_video_views(p_video_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update user_videos set view_count = view_count + 1 where id = p_video_id;
end;
$$;

-- Storage buckets for user uploads
insert into storage.buckets (id, name, public) values ('user-videos', 'user-videos', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('thumbnails', 'thumbnails', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('subtitles', 'subtitles', true) on conflict do nothing;

-- user-videos: public read, owner upload
create policy "Public read user-videos"
  on storage.objects for select
  using (bucket_id = 'user-videos');

create policy "Auth users upload user-videos"
  on storage.objects for insert
  with check (
    bucket_id = 'user-videos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- thumbnails: public read, owner upload
create policy "Public read thumbnails"
  on storage.objects for select
  using (bucket_id = 'thumbnails');

create policy "Auth users upload thumbnails"
  on storage.objects for insert
  with check (
    bucket_id = 'thumbnails'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- subtitles: public read, owner upload
create policy "Public read subtitles"
  on storage.objects for select
  using (bucket_id = 'subtitles');

create policy "Auth users upload subtitles"
  on storage.objects for insert
  with check (
    bucket_id = 'subtitles'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================
-- Subscriptions
-- =============================================

-- Add subscriber_count to profiles
alter table profiles add column if not exists subscriber_count int default 0;

-- Subscriptions table
create table if not exists subscriptions (
  subscriber_id uuid references auth.users(id) on delete cascade,
  channel_user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (subscriber_id, channel_user_id),
  check (subscriber_id != channel_user_id)
);

alter table subscriptions enable row level security;

-- Subscriptions RLS
create policy "Public read subscriptions"
  on subscriptions for select
  using (true);

create policy "Auth users insert subscriptions"
  on subscriptions for insert
  with check (auth.uid() = subscriber_id);

create policy "Auth users delete subscriptions"
  on subscriptions for delete
  using (auth.uid() = subscriber_id);

-- Trigger to update subscriber_count on profiles
create or replace function update_subscriber_count()
returns trigger
language plpgsql
security definer
as $$
begin
  if TG_OP = 'INSERT' then
    update profiles set subscriber_count = subscriber_count + 1 where id = NEW.channel_user_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update profiles set subscriber_count = subscriber_count - 1 where id = OLD.channel_user_id;
    return OLD;
  end if;
end;
$$;

create trigger on_subscription_change
  after insert or delete on subscriptions
  for each row execute function update_subscriber_count();

-- =============================================
-- Notifications
-- =============================================

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references auth.users(id) on delete cascade not null,
  actor_id uuid references auth.users(id) on delete set null,
  type text not null check (type in ('comment', 'reply', 'subscription', 'video')),
  entity_id text,
  title text not null,
  message text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  read_at timestamptz
);

create index if not exists notifications_recipient_created_idx
  on notifications (recipient_id, created_at desc);

alter table notifications enable row level security;

create policy "Recipients can read notifications"
  on notifications for select
  using (auth.uid() = recipient_id);

create policy "Recipients can update notifications"
  on notifications for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

create policy "Authenticated users can insert notifications"
  on notifications for insert
  with check (
    auth.role() = 'authenticated'
    and (actor_id is null or actor_id = auth.uid())
  );
