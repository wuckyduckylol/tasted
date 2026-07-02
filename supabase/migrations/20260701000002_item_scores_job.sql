-- Community score recompute (SPEC 5.2, 5.6, Section 8)

-- Anti-brigading weight (SPEC 5.6): scales with account age and rating history,
-- capped at 1. Brand-new throwaway accounts contribute 0.25x.
create or replace function public.rating_weight(account_created timestamptz, user_rating_count bigint)
returns numeric
language sql stable
as $$
  select least(1.0,
    0.25
    + 0.375 * least(extract(epoch from (now() - account_created)) / (7 * 86400.0), 1.0)
    + 0.375 * least(user_rating_count / 10.0, 1.0)
  );
$$;

-- Recompute one item's aggregate row. New items use a higher Bayesian m while
-- forming (SPEC 5.6 new-item cooling).
create or replace function public.recompute_item_score(p_item_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_m numeric;
  v_c numeric;
begin
  select case when i.is_new then 15 else 10 end into v_m from public.items i where i.id = p_item_id;
  if v_m is null then return; end if;

  select coalesce(avg(personal_score), 5.0) into v_c from public.ratings;

  insert into public.item_scores as s
    (item_id, num_ratings, mean_score, weighted_score, worth_it_pct,
     dist_loved, dist_fine, dist_disliked, updated_at)
  select
    p_item_id,
    agg.v,
    round(agg.r_mean, 2),
    round((agg.v / (agg.v + v_m)) * agg.r_mean + (v_m / (agg.v + v_m)) * v_c, 2),
    round(agg.woa_pct, 2),
    agg.dl, agg.df, agg.dd,
    now()
  from (
    select
      count(*)::numeric as v,
      coalesce(sum(w.weight * w.personal_score) / nullif(sum(w.weight), 0), 0) as r_mean,
      coalesce(100.0 * sum(w.weight * (w.would_order_again::int)) / nullif(sum(w.weight), 0), 0) as woa_pct,
      count(*) filter (where w.band = 'loved') as dl,
      count(*) filter (where w.band = 'fine') as df,
      count(*) filter (where w.band = 'disliked') as dd
    from (
      select rt.personal_score, rt.would_order_again, rt.band,
             public.rating_weight(
               p.created_at,
               (select count(*) from public.ratings rr where rr.user_id = rt.user_id)
             ) as weight
      from public.ratings rt
      join public.profiles p on p.id = rt.user_id
      where rt.item_id = p_item_id
    ) w
  ) agg
  where agg.v > 0
  on conflict (item_id) do update set
    num_ratings = excluded.num_ratings,
    mean_score = excluded.mean_score,
    weighted_score = excluded.weighted_score,
    worth_it_pct = excluded.worth_it_pct,
    dist_loved = excluded.dist_loved,
    dist_fine = excluded.dist_fine,
    dist_disliked = excluded.dist_disliked,
    updated_at = excluded.updated_at;

  -- No ratings at all → remove the aggregate row (empty state, never a fake zero).
  if not exists (select 1 from public.ratings where item_id = p_item_id) then
    delete from public.item_scores where item_id = p_item_id;
  end if;
end;
$$;

-- Full recompute across every rated item (scheduled; also callable on demand).
create or replace function public.recompute_item_scores()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  r record;
begin
  for r in select distinct item_id from public.ratings loop
    perform public.recompute_item_score(r.item_id);
  end loop;
end;
$$;

-- Keep aggregates fresh on every rating change.
create or replace function public.on_rating_changed()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_item_score(old.item_id);
    return old;
  end if;
  perform public.recompute_item_score(new.item_id);
  return new;
end;
$$;

create trigger ratings_recompute_scores
  after insert or update or delete on public.ratings
  for each row execute function public.on_rating_changed();

-- Scheduled full recompute every 5 minutes (keeps global mean C fresh).
-- pg_cron must be enabled on the Supabase project; skip quietly if missing.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('recompute_item_scores', '*/5 * * * *',
                        'select public.recompute_item_scores()');
exception when others then
  raise notice 'pg_cron unavailable; schedule recompute_item_scores manually (%).', sqlerrm;
end;
$$;
