create unique index foods_source_id_upsert
  on public.foods (source, source_id);

create or replace function public.search_foods(
  raw_query text,
  result_limit integer default 20
)
returns table (
  id uuid,
  name_sv text,
  name_en text,
  brand text,
  barcode text,
  source text,
  kcal numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  fiber_g numeric,
  sugar_g numeric,
  salt_g numeric,
  alcohol_g numeric,
  is_verified boolean
)
language plpgsql
stable
security invoker
set search_path = public, extensions
as $$
declare
  q text := left(btrim(raw_query), 80);
  needle text := replace(replace(replace(q, '\', ''), '%', ''), '_', '');
begin
  if q = '' then
    return;
  end if;

  return query
  with recent as (
    select entries.food_id, count(*)::integer as uses
    from public.food_log_entries as entries
    where entries.user_id = (select auth.uid())
    group by entries.food_id
  )
  select
    foods.id,
    foods.name_sv,
    foods.name_en,
    foods.brand,
    foods.barcode,
    foods.source,
    foods.kcal,
    foods.protein_g,
    foods.carbs_g,
    foods.fat_g,
    foods.fiber_g,
    foods.sugar_g,
    foods.salt_g,
    foods.alcohol_g,
    foods.is_verified
  from public.foods as foods
  left join recent on recent.food_id = foods.id
  where (foods.owner_user_id is null or foods.owner_user_id = (select auth.uid()))
    and (
      foods.search_sv @@ websearch_to_tsquery('swedish', q)
      or extensions.similarity(foods.name_sv, q) > 0.2
      or foods.name_sv ilike '%' || needle || '%'
      or coalesce(foods.name_en, '') ilike '%' || needle || '%'
      or coalesce(foods.brand, '') ilike '%' || needle || '%'
      or foods.barcode = q
    )
  order by
    coalesce(recent.uses, 0) desc,
    foods.is_verified desc,
    greatest(
      extensions.similarity(foods.name_sv, q),
      ts_rank(foods.search_sv, websearch_to_tsquery('swedish', q))
    ) desc,
    foods.name_sv asc
  limit least(greatest(result_limit, 1), 30);
end;
$$;

revoke all on function public.search_foods(text, integer) from public, anon;
grant execute on function public.search_foods(text, integer) to authenticated;

create or replace function public.cache_open_food(
  p_source_id text,
  p_name_sv text,
  p_name_en text,
  p_brand text,
  p_barcode text,
  p_kcal numeric,
  p_protein_g numeric,
  p_carbs_g numeric,
  p_fat_g numeric,
  p_fiber_g numeric,
  p_sugar_g numeric,
  p_salt_g numeric,
  p_alcohol_g numeric
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  result_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated';
  end if;

  if p_source_id is null or length(btrim(p_source_id)) = 0
    or p_barcode is null or length(btrim(p_barcode)) = 0
    or p_name_sv is null or length(btrim(p_name_sv)) = 0
    or p_kcal < 0 or p_protein_g < 0 or p_carbs_g < 0 or p_fat_g < 0
    or (p_fiber_g is not null and p_fiber_g < 0)
    or (p_sugar_g is not null and p_sugar_g < 0)
    or (p_salt_g is not null and p_salt_g < 0)
    or (p_alcohol_g is not null and p_alcohol_g < 0)
  then
    raise exception 'invalid food';
  end if;

  select foods.id into result_id
  from public.foods as foods
  where foods.source = 'openfoodfacts'
    and foods.source_id = btrim(p_source_id);

  if result_id is null then
    insert into public.foods (
      source,
      source_id,
      owner_user_id,
      name_sv,
      name_en,
      brand,
      barcode,
      kcal,
      protein_g,
      carbs_g,
      fat_g,
      fiber_g,
      sugar_g,
      salt_g,
      alcohol_g,
      is_verified,
      last_synced_at
    ) values (
      'openfoodfacts',
      btrim(p_source_id),
      null,
      btrim(p_name_sv),
      nullif(btrim(coalesce(p_name_en, '')), ''),
      nullif(btrim(coalesce(p_brand, '')), ''),
      btrim(p_barcode),
      p_kcal,
      p_protein_g,
      p_carbs_g,
      p_fat_g,
      p_fiber_g,
      p_sugar_g,
      p_salt_g,
      p_alcohol_g,
      false,
      now()
    )
    returning foods.id into result_id;
  else
    update public.foods set
      name_sv = btrim(p_name_sv),
      name_en = nullif(btrim(coalesce(p_name_en, '')), ''),
      brand = nullif(btrim(coalesce(p_brand, '')), ''),
      barcode = btrim(p_barcode),
      kcal = p_kcal,
      protein_g = p_protein_g,
      carbs_g = p_carbs_g,
      fat_g = p_fat_g,
      fiber_g = p_fiber_g,
      sugar_g = p_sugar_g,
      salt_g = p_salt_g,
      alcohol_g = p_alcohol_g,
      last_synced_at = now()
    where foods.id = result_id;
  end if;

  return result_id;
end;
$$;

revoke all on function public.cache_open_food(
  text, text, text, text, text,
  numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric
) from public, anon;

grant execute on function public.cache_open_food(
  text, text, text, text, text,
  numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric
) to authenticated;
