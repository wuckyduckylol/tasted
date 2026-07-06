-- Onboarding wizard support (Get Started walkthrough):
-- 1) avatars storage bucket + per-user write policies
-- 2) user_favorite_chains — "pick your top 3", seeds the top-10 recommendation list

-- ---------------------------------------------------------------------------
-- 1) Avatars bucket: public read, users manage files under their own uid/ folder.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_public_read" on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_insert_own" on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_update_own" on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_delete_own" on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ---------------------------------------------------------------------------
-- 2) Top-3 favorite chains picked during onboarding (rank 1..3).
-- ---------------------------------------------------------------------------
create table public.user_favorite_chains (
  user_id uuid not null references public.profiles(id) on delete cascade,
  chain_id uuid not null references public.chains(id) on delete cascade,
  rank int not null check (rank between 1 and 3),
  created_at timestamptz not null default now(),
  primary key (user_id, chain_id),
  unique (user_id, rank)
);

alter table public.user_favorite_chains enable row level security;

create policy "favorite_chains_all_own" on public.user_favorite_chains for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
