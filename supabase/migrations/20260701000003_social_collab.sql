-- Social + collaborative filtering (SPEC 5.4, 6.3, Section 8)

-- Nightly batch: top-20 neighbors per user by Pearson over co-rated items (>=3).
create or replace function public.recompute_user_similarity()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  delete from public.user_similarity;
  insert into public.user_similarity (user_a, user_b, similarity, co_rated)
  select user_a, user_b, round(sim::numeric, 4), n
  from (
    select r1.user_id as user_a,
           r2.user_id as user_b,
           corr(r1.personal_score, r2.personal_score) as sim,
           count(*)::int as n,
           row_number() over (
             partition by r1.user_id
             order by corr(r1.personal_score, r2.personal_score) desc
           ) as rn
    from public.ratings r1
    join public.ratings r2 on r2.item_id = r1.item_id and r2.user_id <> r1.user_id
    group by r1.user_id, r2.user_id
    having count(*) >= 3
       and corr(r1.personal_score, r2.personal_score) is not null
  ) ranked
  where rn <= 20;
end;
$$;

-- Collaborative predictions for the caller (SPEC 5.4 predictCollab), computed
-- server-side so neighbor ratings never leave the database (Section 9).
create or replace function public.collab_predictions(p_item_ids uuid[])
returns table (item_id uuid, predicted_score numeric, neighbors int)
language sql security definer set search_path = public
as $$
  select r.item_id,
         round((sum(us.similarity * r.personal_score) / nullif(sum(us.similarity), 0))::numeric, 2),
         count(*)::int
  from public.user_similarity us
  join public.ratings r on r.user_id = us.user_b and r.item_id = any(p_item_ids)
  where us.user_a = auth.uid()
    and us.similarity > 0.2
  group by r.item_id
  having sum(us.similarity) > 0;
$$;

-- Friends' recent ratings (SPEC 6.3), respecting private profiles.
create or replace function public.friends_recent_ratings(p_limit int default 20)
returns table (
  user_id uuid,
  username text,
  item_id uuid,
  item_name text,
  band text,
  personal_score numeric,
  rated_at timestamptz
)
language sql security definer set search_path = public
as $$
  select r.user_id, p.username, r.item_id, i.name, r.band, r.personal_score, r.updated_at
  from public.follows f
  join public.ratings r on r.user_id = f.following_id
  join public.profiles p on p.id = r.user_id and not p.is_private
  join public.items i on i.id = r.item_id
  where f.follower_id = auth.uid()
  order by r.updated_at desc
  limit least(greatest(p_limit, 1), 100);
$$;

-- Public profile lookup for the follow-by-username flow.
create or replace function public.find_profile_by_username(p_username text)
returns table (id uuid, username text, display_name text, is_private boolean)
language sql security definer set search_path = public
as $$
  select id, username, display_name, is_private
  from public.profiles
  where lower(username) = lower(p_username)
  limit 1;
$$;

do $$
begin
  perform cron.schedule('recompute_user_similarity', '30 3 * * *',
                        'select public.recompute_user_similarity()');
exception when others then
  raise notice 'pg_cron unavailable; schedule recompute_user_similarity manually (%).', sqlerrm;
end;
$$;
