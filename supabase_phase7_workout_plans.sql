create table if not exists public.workout_plan_variants (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  split_type text not null check (split_type in ('push', 'pull', 'legs')),
  name text not null,
  created_at timestamptz not null default now(),
  constraint workout_plan_variants_name_not_empty check (char_length(trim(name)) > 0)
);

create index if not exists workout_plan_variants_user_split_idx
  on public.workout_plan_variants (user_id, split_type, created_at);

create table if not exists public.workout_plan_exercises (
  id bigint generated always as identity primary key,
  variant_id bigint not null references public.workout_plan_variants(id) on delete cascade,
  position integer not null check (position > 0),
  exercise_name text not null,
  sets integer,
  rep_range text,
  notes text,
  created_at timestamptz not null default now(),
  unique (variant_id, position),
  constraint workout_plan_exercises_name_not_empty check (char_length(trim(exercise_name)) > 0)
);

create index if not exists workout_plan_exercises_variant_position_idx
  on public.workout_plan_exercises (variant_id, position);

grant select, insert, update, delete on public.workout_plan_variants to authenticated;
grant select, insert, update, delete on public.workout_plan_exercises to authenticated;

alter table public.workout_plan_variants enable row level security;
alter table public.workout_plan_exercises enable row level security;

drop policy if exists plan_variants_select on public.workout_plan_variants;
create policy plan_variants_select
on public.workout_plan_variants
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists plan_variants_insert on public.workout_plan_variants;
create policy plan_variants_insert
on public.workout_plan_variants
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists plan_variants_update on public.workout_plan_variants;
create policy plan_variants_update
on public.workout_plan_variants
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists plan_variants_delete on public.workout_plan_variants;
create policy plan_variants_delete
on public.workout_plan_variants
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists plan_exercises_select on public.workout_plan_exercises;
create policy plan_exercises_select
on public.workout_plan_exercises
for select
to authenticated
using (
  exists (
    select 1
    from public.workout_plan_variants v
    where v.id = workout_plan_exercises.variant_id
      and v.user_id = auth.uid()
  )
);

drop policy if exists plan_exercises_insert on public.workout_plan_exercises;
create policy plan_exercises_insert
on public.workout_plan_exercises
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workout_plan_variants v
    where v.id = workout_plan_exercises.variant_id
      and v.user_id = auth.uid()
  )
);

drop policy if exists plan_exercises_update on public.workout_plan_exercises;
create policy plan_exercises_update
on public.workout_plan_exercises
for update
to authenticated
using (
  exists (
    select 1
    from public.workout_plan_variants v
    where v.id = workout_plan_exercises.variant_id
      and v.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.workout_plan_variants v
    where v.id = workout_plan_exercises.variant_id
      and v.user_id = auth.uid()
  )
);

drop policy if exists plan_exercises_delete on public.workout_plan_exercises;
create policy plan_exercises_delete
on public.workout_plan_exercises
for delete
to authenticated
using (
  exists (
    select 1
    from public.workout_plan_variants v
    where v.id = workout_plan_exercises.variant_id
      and v.user_id = auth.uid()
  )
);
