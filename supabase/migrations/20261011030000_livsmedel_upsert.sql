create or replace function public.upsert_livsmedel(
  p_source_id text,
  p_name_sv text,
  p_name_en text,
  p_kcal numeric,
  p_protein_g numeric,
  p_carbs_g numeric,
  p_fat_g numeric,
  p_fiber_g numeric,
  p_sugar_g numeric,
  p_salt_g numeric,
  p_alcohol_g numeric,
  p_source_version text
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
    or p_name_sv is null or length(btrim(p_name_sv)) = 0
    or p_kcal < 0 or p_protein_g < 0 or p_carbs_g < 0 or p_fat_g < 0
  then
    raise exception 'invalid food';
  end if;

  select foods.id into result_id
  from public.foods as foods
  where foods.source = 'livsmedelsverket'
    and foods.source_id = btrim(p_source_id);

  if result_id is null then
    insert into public.foods (
      source, source_id, owner_user_id, name_sv, name_en,
      kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, salt_g, alcohol_g,
      is_verified, source_version, last_synced_at
    ) values (
      'livsmedelsverket',
      btrim(p_source_id),
      null,
      btrim(p_name_sv),
      nullif(btrim(coalesce(p_name_en, '')), ''),
      p_kcal, p_protein_g, p_carbs_g, p_fat_g,
      p_fiber_g, p_sugar_g, p_salt_g, p_alcohol_g,
      true,
      nullif(btrim(coalesce(p_source_version, '')), ''),
      now()
    )
    returning foods.id into result_id;
  else
    update public.foods set
      name_sv = btrim(p_name_sv),
      name_en = nullif(btrim(coalesce(p_name_en, '')), ''),
      kcal = p_kcal,
      protein_g = p_protein_g,
      carbs_g = p_carbs_g,
      fat_g = p_fat_g,
      fiber_g = p_fiber_g,
      sugar_g = p_sugar_g,
      salt_g = p_salt_g,
      alcohol_g = p_alcohol_g,
      is_verified = true,
      last_synced_at = now()
    where foods.id = result_id;
  end if;

  return result_id;
end;
$$;

revoke all on function public.upsert_livsmedel(
  text, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text
) from public, anon;

grant execute on function public.upsert_livsmedel(
  text, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text
) to authenticated;
