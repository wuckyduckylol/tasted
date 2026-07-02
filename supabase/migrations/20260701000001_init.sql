-- Tasted: initial schema (SPEC.md Sections 4, 9, 5.6)

-- ---------------------------------------------------------------------------
-- profiles (4.1) — mirrors auth.users
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-zA-Z0-9_]{3,20}$'),
  display_name text,
  avatar_url text,
  is_private boolean not null default false,
  streak_count int not null default 0,
  last_active_date date,
  created_at timestamptz not null default now()
);

-- Auto-create a profile on signup; username comes from auth metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  desired text;
begin
  desired := coalesce(
    nullif(regexp_replace(new.raw_user_meta_data->>'username', '[^a-zA-Z0-9_]', '', 'g'), ''),
    'user_' || substr(replace(new.id::text, '-', ''), 1, 10)
  );
  desired := substr(desired, 1, 20);
  if char_length(desired) < 3 then
    desired := 'user_' || substr(replace(new.id::text, '-', ''), 1, 10);
  end if;
  begin
    insert into public.profiles (id, username) values (new.id, desired);
  exception when unique_violation then
    insert into public.profiles (id, username)
    values (new.id, substr(desired, 1, 13) || '_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  end;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- catalog: chains (4.2), items (4.3), tags (4.4), item_tags (4.5)
-- ---------------------------------------------------------------------------
create table public.chains (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  logo_url text,
  is_active boolean not null default true,
  display_order int,
  launched_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  chain_id uuid not null references public.chains(id),
  name text not null,
  description text,
  bucket text not null check (bucket in ('drinks','sweet','savory')),
  image_url text,
  attributes jsonb not null default '{}',
  is_active boolean not null default true,
  is_new boolean not null default false,
  launched_at timestamptz,
  created_at timestamptz not null default now()
);
create index items_chain_idx on public.items (chain_id) where is_active;
create index items_new_idx on public.items (is_new) where is_new;

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);

create table public.item_tags (
  item_id uuid not null references public.items(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (item_id, tag_id)
);
create index item_tags_tag_idx on public.item_tags (tag_id);

-- ---------------------------------------------------------------------------
-- ratings (4.6) + comparisons (4.7)
-- ---------------------------------------------------------------------------
create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.items(id),
  band text not null check (band in ('loved','fine','disliked')),
  would_order_again boolean not null,
  personal_score numeric(4,2) not null check (personal_score >= 0 and personal_score <= 10),
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, item_id)
);
create index ratings_item_idx on public.ratings (item_id);
create index ratings_user_idx on public.ratings (user_id, updated_at desc);

-- Rate limit (5.6): max 30 new ratings per user per hour.
create or replace function public.enforce_rating_rate_limit()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (select count(*) from public.ratings
      where user_id = new.user_id and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'rating_rate_limit_exceeded' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger ratings_rate_limit
  before insert on public.ratings
  for each row execute function public.enforce_rating_rate_limit();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger ratings_touch before update on public.ratings
  for each row execute function public.set_updated_at();

create table public.comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bucket text not null check (bucket in ('drinks','sweet','savory')),
  band text not null check (band in ('loved','fine','disliked')),
  item_a uuid not null references public.items(id),
  item_b uuid not null references public.items(id),
  winner_item_id uuid references public.items(id),
  created_at timestamptz not null default now(),
  check (winner_item_id is null or winner_item_id = item_a or winner_item_id = item_b)
);
create index comparisons_user_idx on public.comparisons (user_id);

-- Atomically apply re-ranked personal scores for the caller's own ratings
-- after a band re-rank (SPEC 5.1 recomputeBandScores). p_scores: {item_id: score}.
create or replace function public.replace_band_rankings(p_bucket text, p_band text, p_scores jsonb)
returns void
language plpgsql security invoker set search_path = public
as $$
declare
  entry record;
begin
  for entry in select key, value from jsonb_each_text(p_scores) loop
    update public.ratings
      set personal_score = entry.value::numeric
      where user_id = auth.uid() and item_id = entry.key::uuid and band = p_band;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- item_scores (4.8) — community aggregates, written by service-role job only
-- ---------------------------------------------------------------------------
create table public.item_scores (
  item_id uuid primary key references public.items(id) on delete cascade,
  num_ratings int not null default 0,
  mean_score numeric(4,2),
  weighted_score numeric(4,2),
  worth_it_pct numeric(5,2),
  dist_loved int not null default 0,
  dist_fine int not null default 0,
  dist_disliked int not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- personalization: taste_profiles (4.9), user_similarity (4.10), predicted_scores (4.11)
-- ---------------------------------------------------------------------------
create table public.taste_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  attribute_weights jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.user_similarity (
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  similarity numeric(5,4) not null check (similarity >= -1 and similarity <= 1),
  co_rated int not null,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b)
);

create table public.predicted_scores (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  predicted_score numeric(4,2) not null,
  source text not null check (source in ('content','collab','blend','community')),
  confidence numeric(4,3) not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- ---------------------------------------------------------------------------
-- want_to_try (4.12), follows (4.13)
-- ---------------------------------------------------------------------------
create table public.want_to_try (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

-- ---------------------------------------------------------------------------
-- vote-to-unlock: chain_candidates (4.14), chain_votes (4.15)
-- ---------------------------------------------------------------------------
create table public.chain_candidates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  is_unlocked boolean not null default false,
  vote_count int not null default 0,
  created_at timestamptz not null default now()
);

create table public.chain_votes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  candidate_id uuid not null references public.chain_candidates(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, candidate_id)
);

create or replace function public.sync_candidate_vote_count()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.chain_candidates set vote_count = vote_count + 1 where id = new.candidate_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.chain_candidates set vote_count = greatest(vote_count - 1, 0) where id = old.candidate_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger chain_votes_sync
  after insert or delete on public.chain_votes
  for each row execute function public.sync_candidate_vote_count();

-- ---------------------------------------------------------------------------
-- reports (4.16), notifications (4.17), push_tokens (4.18)
-- ---------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('rating','note','user','photo')),
  target_id uuid not null,
  reason text check (char_length(reason) <= 500),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.push_tokens (
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null,
  platform text,
  created_at timestamptz not null default now(),
  primary key (user_id, expo_push_token)
);

-- ---------------------------------------------------------------------------
-- item_suggestions (SPEC 13) — curated catalog; users suggest, admins approve
-- ---------------------------------------------------------------------------
create table public.item_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  chain_id uuid references public.chains(id),
  name text not null check (char_length(name) <= 120),
  details text check (char_length(details) <= 500),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row-Level Security (Section 9)
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.chains enable row level security;
alter table public.items enable row level security;
alter table public.tags enable row level security;
alter table public.item_tags enable row level security;
alter table public.ratings enable row level security;
alter table public.comparisons enable row level security;
alter table public.item_scores enable row level security;
alter table public.taste_profiles enable row level security;
alter table public.user_similarity enable row level security;
alter table public.predicted_scores enable row level security;
alter table public.want_to_try enable row level security;
alter table public.follows enable row level security;
alter table public.chain_candidates enable row level security;
alter table public.chain_votes enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;
alter table public.item_suggestions enable row level security;

-- profiles: public profiles readable by all signed-in users; private only by owner.
create policy "profiles_select" on public.profiles for select
  using (not is_private or id = auth.uid());
create policy "profiles_update_own" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- catalog: world-readable, service-role writes only (no write policies).
create policy "chains_select" on public.chains for select using (true);
create policy "items_select" on public.items for select using (true);
create policy "tags_select" on public.tags for select using (true);
create policy "item_tags_select" on public.item_tags for select using (true);
create policy "chain_candidates_select" on public.chain_candidates for select using (true);

-- ratings: own rows only.
create policy "ratings_select_own" on public.ratings for select using (user_id = auth.uid());
create policy "ratings_insert_own" on public.ratings for insert with check (user_id = auth.uid());
create policy "ratings_update_own" on public.ratings for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "ratings_delete_own" on public.ratings for delete using (user_id = auth.uid());

-- comparisons: own rows only, append-only from the client.
create policy "comparisons_select_own" on public.comparisons for select using (user_id = auth.uid());
create policy "comparisons_insert_own" on public.comparisons for insert with check (user_id = auth.uid());

-- item_scores: world-readable aggregates; recomputed server-side only.
create policy "item_scores_select" on public.item_scores for select using (true);

-- taste_profiles / predicted_scores: own rows only.
create policy "taste_profiles_all_own" on public.taste_profiles for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "predicted_scores_all_own" on public.predicted_scores for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- user_similarity: readable where you are a participant; written by batch job.
create policy "user_similarity_select_own" on public.user_similarity for select
  using (user_a = auth.uid() or user_b = auth.uid());

-- want_to_try: own rows only.
create policy "want_to_try_all_own" on public.want_to_try for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- follows: manage own follow edges; both sides can see the edge.
create policy "follows_select_own" on public.follows for select
  using (follower_id = auth.uid() or following_id = auth.uid());
create policy "follows_insert_own" on public.follows for insert with check (follower_id = auth.uid());
create policy "follows_delete_own" on public.follows for delete using (follower_id = auth.uid());

-- chain_votes: insert/read own; counts read via chain_candidates.
create policy "chain_votes_select_own" on public.chain_votes for select using (user_id = auth.uid());
create policy "chain_votes_insert_own" on public.chain_votes for insert with check (user_id = auth.uid());

-- reports: write-only for users; reviewed by service role.
create policy "reports_insert_own" on public.reports for insert with check (reporter_id = auth.uid());

-- notifications: owner reads and marks read.
create policy "notifications_select_own" on public.notifications for select using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- push_tokens: owner-scoped.
create policy "push_tokens_all_own" on public.push_tokens for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- item_suggestions: users file and view their own; admins act via service role.
create policy "item_suggestions_select_own" on public.item_suggestions for select using (user_id = auth.uid());
create policy "item_suggestions_insert_own" on public.item_suggestions for insert with check (user_id = auth.uid());
