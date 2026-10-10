-- Kondis foundation: profile, goals, food, training, and body metrics.
-- Shared catalog rows (owner_user_id is null) are readable by signed-in users
-- and writable only with the service role, which bypasses row level security.

create extension if not exists pg_trgm with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  locale text not null default 'sv-SE' check (locale in ('sv-SE', 'en')),
  timezone text not null default 'Europe/Stockholm',
  sex text check (sex in ('male', 'female')),
  birth_date date,
  height_cm numeric check (height_cm is null or height_cm > 0),
  activity_level text check (
    activity_level is null
    or activity_level in ('sedentary', 'light', 'moderate', 'high', 'very_high')
  ),
  unit_system text not null default 'metric' check (unit_system = 'metric'),
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  effective_from date not null,
  kcal numeric not null check (kcal >= 0),
  protein_g numeric not null check (protein_g >= 0),
  carbs_g numeric not null check (carbs_g >= 0),
  fat_g numeric not null check (fat_g >= 0),
  goal_type text not null check (goal_type in ('cut', 'maintain', 'bulk')),
  target_rate_kg_per_week numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index goals_user_effective_idx
  on public.goals (user_id, effective_from desc, created_at desc);

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('livsmedelsverket', 'openfoodfacts', 'user')),
  source_id text,
  owner_user_id uuid references auth.users (id) on delete cascade,
  name_sv text not null,
  name_en text,
  brand text,
  barcode text,
  kcal numeric not null check (kcal >= 0),
  protein_g numeric not null check (protein_g >= 0),
  carbs_g numeric not null check (carbs_g >= 0),
  fat_g numeric not null check (fat_g >= 0),
  fiber_g numeric check (fiber_g is null or fiber_g >= 0),
  sugar_g numeric check (sugar_g is null or sugar_g >= 0),
  salt_g numeric check (salt_g is null or salt_g >= 0),
  alcohol_g numeric check (alcohol_g is null or alcohol_g >= 0),
  is_verified boolean not null default false,
  source_version text,
  last_synced_at timestamptz,
  search_sv tsvector generated always as (
    to_tsvector('swedish', coalesce(name_sv, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (source = 'user' and owner_user_id is not null)
    or (source in ('livsmedelsverket', 'openfoodfacts') and owner_user_id is null)
  )
);

create unique index foods_source_id_unique
  on public.foods (source, source_id)
  where source_id is not null;

create index foods_owner_idx on public.foods (owner_user_id);
create index foods_barcode_idx on public.foods (barcode) where barcode is not null;
create index foods_search_sv_idx on public.foods using gin (search_sv);
create index foods_name_sv_trgm_idx on public.foods using gin (name_sv extensions.gin_trgm_ops);

create table public.food_servings (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.foods (id) on delete cascade,
  label_sv text not null,
  label_en text,
  grams numeric not null check (grams > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index food_servings_food_idx on public.food_servings (food_id);

create table public.food_log_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  meal text not null check (meal in ('frukost', 'lunch', 'middag', 'mellanmal')),
  food_id uuid not null references public.foods (id),
  serving_id uuid references public.food_servings (id),
  quantity numeric not null check (quantity > 0),
  grams numeric not null check (grams >= 0),
  kcal_100 numeric not null,
  protein_100 numeric not null,
  carbs_100 numeric not null,
  fat_100 numeric not null,
  fiber_100 numeric,
  sugar_100 numeric,
  salt_100 numeric,
  alcohol_100 numeric,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index food_log_entries_user_date_idx
  on public.food_log_entries (user_id, log_date);

create table public.quick_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  meal text not null check (meal in ('frukost', 'lunch', 'middag', 'mellanmal')),
  label text not null,
  kcal numeric not null check (kcal >= 0),
  protein_g numeric not null default 0 check (protein_g >= 0),
  carbs_g numeric not null default 0 check (carbs_g >= 0),
  fat_g numeric not null default 0 check (fat_g >= 0),
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index quick_entries_user_date_idx on public.quick_entries (user_id, log_date);

create table public.saved_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index saved_meals_user_idx on public.saved_meals (user_id);

create table public.saved_meal_items (
  id uuid primary key default gen_random_uuid(),
  saved_meal_id uuid not null references public.saved_meals (id) on delete cascade,
  food_id uuid not null references public.foods (id),
  serving_id uuid references public.food_servings (id),
  quantity numeric not null check (quantity > 0),
  grams numeric not null check (grams >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index saved_meal_items_meal_idx on public.saved_meal_items (saved_meal_id, sort_order);

create table public.favorite_foods (
  user_id uuid not null references auth.users (id) on delete cascade,
  food_id uuid not null references public.foods (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, food_id)
);

create table public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  weight_kg numeric check (weight_kg is null or weight_kg > 0),
  waist_cm numeric check (waist_cm is null or waist_cm > 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date),
  check (weight_kg is not null or waist_cm is not null)
);

create index body_metrics_user_date_idx on public.body_metrics (user_id, log_date desc);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users (id) on delete cascade,
  name_sv text not null,
  name_en text,
  primary_muscle text,
  equipment text,
  is_bodyweight boolean not null default false,
  default_increment_kg numeric not null default 2.5 check (default_increment_kg > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index exercises_owner_idx on public.exercises (owner_user_id);
create index exercises_name_sv_trgm_idx on public.exercises using gin (name_sv extensions.gin_trgm_ops);

create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_templates_user_idx on public.workout_templates (user_id, sort_order);

create table public.template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_templates (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  sort_order integer not null default 0,
  target_sets integer not null check (target_sets > 0),
  target_reps_min integer not null check (target_reps_min > 0),
  target_reps_max integer not null check (target_reps_max >= target_reps_min),
  rest_seconds integer not null default 120 check (rest_seconds >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index template_exercises_template_idx
  on public.template_exercises (template_id, sort_order);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  template_id uuid references public.workout_templates (id),
  started_at timestamptz,
  ended_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_sessions_user_date_idx
  on public.workout_sessions (user_id, log_date);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  set_index integer not null check (set_index > 0),
  weight_kg numeric check (weight_kg is null or weight_kg >= 0),
  reps integer check (reps is null or reps >= 0),
  rpe numeric check (rpe is null or (rpe >= 0 and rpe <= 10)),
  is_warmup boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_sets_session_idx
  on public.workout_sets (session_id, exercise_id, set_index);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger goals_set_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();
create trigger foods_set_updated_at
  before update on public.foods
  for each row execute function public.set_updated_at();
create trigger food_servings_set_updated_at
  before update on public.food_servings
  for each row execute function public.set_updated_at();
create trigger food_log_entries_set_updated_at
  before update on public.food_log_entries
  for each row execute function public.set_updated_at();
create trigger quick_entries_set_updated_at
  before update on public.quick_entries
  for each row execute function public.set_updated_at();
create trigger saved_meals_set_updated_at
  before update on public.saved_meals
  for each row execute function public.set_updated_at();
create trigger saved_meal_items_set_updated_at
  before update on public.saved_meal_items
  for each row execute function public.set_updated_at();
create trigger body_metrics_set_updated_at
  before update on public.body_metrics
  for each row execute function public.set_updated_at();
create trigger exercises_set_updated_at
  before update on public.exercises
  for each row execute function public.set_updated_at();
create trigger workout_templates_set_updated_at
  before update on public.workout_templates
  for each row execute function public.set_updated_at();
create trigger template_exercises_set_updated_at
  before update on public.template_exercises
  for each row execute function public.set_updated_at();
create trigger workout_sessions_set_updated_at
  before update on public.workout_sessions
  for each row execute function public.set_updated_at();
create trigger workout_sets_set_updated_at
  before update on public.workout_sets
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.foods enable row level security;
alter table public.food_servings enable row level security;
alter table public.food_log_entries enable row level security;
alter table public.quick_entries enable row level security;
alter table public.saved_meals enable row level security;
alter table public.saved_meal_items enable row level security;
alter table public.favorite_foods enable row level security;
alter table public.body_metrics enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_templates enable row level security;
alter table public.template_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_sets enable row level security;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert on public.goals to authenticated;
grant select, insert, update, delete on public.foods to authenticated;
grant select, insert, update, delete on public.food_servings to authenticated;
grant select, insert, update, delete on public.food_log_entries to authenticated;
grant select, insert, update, delete on public.quick_entries to authenticated;
grant select, insert, update, delete on public.saved_meals to authenticated;
grant select, insert, update, delete on public.saved_meal_items to authenticated;
grant select, insert, update, delete on public.favorite_foods to authenticated;
grant select, insert, update, delete on public.body_metrics to authenticated;
grant select, insert, update, delete on public.exercises to authenticated;
grant select, insert, update, delete on public.workout_templates to authenticated;
grant select, insert, update, delete on public.template_exercises to authenticated;
grant select, insert, update, delete on public.workout_sessions to authenticated;
grant select, insert, update, delete on public.workout_sets to authenticated;

revoke all on public.profiles from anon;
revoke all on public.goals from anon;
revoke all on public.foods from anon;
revoke all on public.food_servings from anon;
revoke all on public.food_log_entries from anon;
revoke all on public.quick_entries from anon;
revoke all on public.saved_meals from anon;
revoke all on public.saved_meal_items from anon;
revoke all on public.favorite_foods from anon;
revoke all on public.body_metrics from anon;
revoke all on public.exercises from anon;
revoke all on public.workout_templates from anon;
revoke all on public.template_exercises from anon;
revoke all on public.workout_sessions from anon;
revoke all on public.workout_sets from anon;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy goals_select_own on public.goals
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy goals_insert_own on public.goals
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy foods_select_visible on public.foods
  for select to authenticated
  using (owner_user_id is null or owner_user_id = (select auth.uid()));
create policy foods_insert_own on public.foods
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()) and source = 'user');
create policy foods_update_own on public.foods
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()) and source = 'user');
create policy foods_delete_own on public.foods
  for delete to authenticated
  using (owner_user_id = (select auth.uid()));

create policy food_servings_select_visible on public.food_servings
  for select to authenticated
  using (
    exists (
      select 1 from public.foods
      where foods.id = food_servings.food_id
        and (foods.owner_user_id is null or foods.owner_user_id = (select auth.uid()))
    )
  );
create policy food_servings_insert_own on public.food_servings
  for insert to authenticated
  with check (
    exists (
      select 1 from public.foods
      where foods.id = food_servings.food_id
        and foods.owner_user_id = (select auth.uid())
    )
  );
create policy food_servings_update_own on public.food_servings
  for update to authenticated
  using (
    exists (
      select 1 from public.foods
      where foods.id = food_servings.food_id
        and foods.owner_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.foods
      where foods.id = food_servings.food_id
        and foods.owner_user_id = (select auth.uid())
    )
  );
create policy food_servings_delete_own on public.food_servings
  for delete to authenticated
  using (
    exists (
      select 1 from public.foods
      where foods.id = food_servings.food_id
        and foods.owner_user_id = (select auth.uid())
    )
  );

create policy food_log_entries_own on public.food_log_entries
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy quick_entries_own on public.quick_entries
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy saved_meals_own on public.saved_meals
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy saved_meal_items_own on public.saved_meal_items
  for all to authenticated
  using (
    exists (
      select 1 from public.saved_meals
      where saved_meals.id = saved_meal_items.saved_meal_id
        and saved_meals.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.saved_meals
      where saved_meals.id = saved_meal_items.saved_meal_id
        and saved_meals.user_id = (select auth.uid())
    )
  );

create policy favorite_foods_own on public.favorite_foods
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy body_metrics_own on public.body_metrics
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy exercises_select_visible on public.exercises
  for select to authenticated
  using (owner_user_id is null or owner_user_id = (select auth.uid()));
create policy exercises_insert_own on public.exercises
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));
create policy exercises_update_own on public.exercises
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));
create policy exercises_delete_own on public.exercises
  for delete to authenticated
  using (owner_user_id = (select auth.uid()));

create policy workout_templates_own on public.workout_templates
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy template_exercises_own on public.template_exercises
  for all to authenticated
  using (
    exists (
      select 1 from public.workout_templates
      where workout_templates.id = template_exercises.template_id
        and workout_templates.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.workout_templates
      where workout_templates.id = template_exercises.template_id
        and workout_templates.user_id = (select auth.uid())
    )
  );

create policy workout_sessions_own on public.workout_sessions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy workout_sets_own on public.workout_sets
  for all to authenticated
  using (
    exists (
      select 1 from public.workout_sessions
      where workout_sessions.id = workout_sets.session_id
        and workout_sessions.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.workout_sessions
      where workout_sessions.id = workout_sets.session_id
        and workout_sessions.user_id = (select auth.uid())
    )
  );
