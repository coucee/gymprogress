create table if not exists public.habits (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint habits_name_not_empty check (char_length(trim(name)) > 0)
);

create index if not exists habits_user_created_idx on public.habits (user_id, created_at);

create table if not exists public.habit_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id bigint not null references public.habits(id) on delete cascade,
  log_date date not null,
  completed boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, habit_id, log_date)
);

create index if not exists habit_logs_user_date_idx on public.habit_logs (user_id, log_date);
create index if not exists habit_logs_habit_date_idx on public.habit_logs (habit_id, log_date);

grant select, insert, update, delete on public.habits to authenticated;
grant select, insert, update, delete on public.habit_logs to authenticated;

alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

drop policy if exists habits_select on public.habits;
create policy habits_select
on public.habits
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists habits_insert on public.habits;
create policy habits_insert
on public.habits
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists habits_update on public.habits;
create policy habits_update
on public.habits
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists habits_delete on public.habits;
create policy habits_delete
on public.habits
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists habit_logs_select on public.habit_logs;
create policy habit_logs_select
on public.habit_logs
for select
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.habits h
    where h.id = habit_logs.habit_id
      and h.user_id = auth.uid()
  )
);

drop policy if exists habit_logs_insert on public.habit_logs;
create policy habit_logs_insert
on public.habit_logs
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.habits h
    where h.id = habit_logs.habit_id
      and h.user_id = auth.uid()
  )
);

drop policy if exists habit_logs_update on public.habit_logs;
create policy habit_logs_update
on public.habit_logs
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.habits h
    where h.id = habit_logs.habit_id
      and h.user_id = auth.uid()
  )
);

drop policy if exists habit_logs_delete on public.habit_logs;
create policy habit_logs_delete
on public.habit_logs
for delete
to authenticated
using (user_id = auth.uid());
