create table if not exists public.recipes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  protein_g numeric(6,2),
  carbs_g numeric(6,2),
  fat_g numeric(6,2),
  calories integer,
  ingredients text,
  created_at timestamptz not null default now(),
  constraint recipes_name_not_empty check (char_length(trim(name)) > 0)
);

create index if not exists recipes_user_name_idx on public.recipes (user_id, name);

create table if not exists public.meal_plans (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  recipe_id bigint not null references public.recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, plan_date)
);

create index if not exists meal_plans_user_date_idx on public.meal_plans (user_id, plan_date);

grant select, insert, update, delete on public.recipes to authenticated;
grant select, insert, update, delete on public.meal_plans to authenticated;

alter table public.recipes enable row level security;
alter table public.meal_plans enable row level security;

drop policy if exists recipes_select on public.recipes;
create policy recipes_select
on public.recipes
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists recipes_insert on public.recipes;
create policy recipes_insert
on public.recipes
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists recipes_update on public.recipes;
create policy recipes_update
on public.recipes
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists recipes_delete on public.recipes;
create policy recipes_delete
on public.recipes
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists meal_plans_select on public.meal_plans;
create policy meal_plans_select
on public.meal_plans
for select
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.recipes r
    where r.id = meal_plans.recipe_id
      and r.user_id = auth.uid()
  )
);

drop policy if exists meal_plans_insert on public.meal_plans;
create policy meal_plans_insert
on public.meal_plans
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.recipes r
    where r.id = meal_plans.recipe_id
      and r.user_id = auth.uid()
  )
);

drop policy if exists meal_plans_update on public.meal_plans;
create policy meal_plans_update
on public.meal_plans
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.recipes r
    where r.id = meal_plans.recipe_id
      and r.user_id = auth.uid()
  )
);

drop policy if exists meal_plans_delete on public.meal_plans;
create policy meal_plans_delete
on public.meal_plans
for delete
to authenticated
using (user_id = auth.uid());
