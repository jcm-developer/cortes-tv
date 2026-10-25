-- Cortes TV: the library table and its row level security.
-- Run once in the Supabase dashboard (SQL Editor > New query > Run). Safe to re-run.
-- See docs/domains/library.md and docs/operations.md.

create table if not exists public.user_titles (
  user_id       uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  key           text        not null,
  media_type    text        not null check (media_type in ('movie', 'tv')),
  tmdb_id       integer     not null check (tmdb_id > 0),
  status        text        not null check (status in ('pending', 'watched')),
  rating        smallint    check (rating between 1 and 5),
  watched_at    date,
  title         text        not null,
  poster_path   text,
  backdrop_path text,
  year          text,
  vote_average  real,
  genre_ids     integer[]   not null default '{}',
  added_at      timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (user_id, key),
  -- The key is always "<media_type>:<tmdb_id>", as in the app.
  constraint user_titles_key_matches check (key = media_type || ':' || tmdb_id),
  -- Only watched titles carry a rating or a watched date.
  constraint user_titles_pending_clean check (
    status = 'watched' or (rating is null and watched_at is null)
  )
);

alter table public.user_titles enable row level security;

drop policy if exists "Users read their titles" on public.user_titles;
create policy "Users read their titles" on public.user_titles
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users add their titles" on public.user_titles;
create policy "Users add their titles" on public.user_titles
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users change their titles" on public.user_titles;
create policy "Users change their titles" on public.user_titles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users remove their titles" on public.user_titles;
create policy "Users remove their titles" on public.user_titles
  for delete to authenticated using ((select auth.uid()) = user_id);
