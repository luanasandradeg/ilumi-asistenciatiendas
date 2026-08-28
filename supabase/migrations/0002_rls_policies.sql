-- Funciones auxiliares (SECURITY DEFINER) para leer el rol/local del usuario
-- autenticado sin disparar recursión en las políticas de RLS sobre `profiles`.

create or replace function app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function app_store_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select store_id from profiles where id = auth.uid()
$$;

-- ========== profiles ==========
alter table profiles enable row level security;

create policy "profiles_select_self" on profiles
  for select using (id = auth.uid());

create policy "profiles_select_manager" on profiles
  for select using (app_role() = 'manager' and store_id = app_store_id());

create policy "profiles_select_admin" on profiles
  for select using (app_role() = 'admin');

create policy "profiles_update_admin" on profiles
  for update using (app_role() = 'admin')
  with check (app_role() = 'admin');

create policy "profiles_update_manager" on profiles
  for update
  using (app_role() = 'manager' and store_id = app_store_id() and role = 'employee')
  with check (app_role() = 'manager' and store_id = app_store_id() and role = 'employee');

-- Las altas de cuentas (auth.users + profiles) se hacen desde la Edge Function
-- `create-employee` con la service role key, que bypassea RLS. No hay policy
-- de INSERT para roles anon/authenticated a propósito.

-- ========== stores ==========
alter table stores enable row level security;

create policy "stores_select_own" on stores
  for select using (id = app_store_id());

create policy "stores_select_admin" on stores
  for select using (app_role() = 'admin');

create policy "stores_write_admin" on stores
  for all using (app_role() = 'admin') with check (app_role() = 'admin');

-- ========== schedules ==========
alter table schedules enable row level security;

create policy "schedules_select_self" on schedules
  for select using (employee_id = auth.uid());

create policy "schedules_select_manager" on schedules
  for select using (
    app_role() = 'manager'
    and exists (
      select 1 from profiles p
      where p.id = schedules.employee_id and p.store_id = app_store_id()
    )
  );

create policy "schedules_select_admin" on schedules
  for select using (app_role() = 'admin');

create policy "schedules_write_manager" on schedules
  for all
  using (
    app_role() = 'manager'
    and exists (
      select 1 from profiles p
      where p.id = schedules.employee_id and p.store_id = app_store_id()
    )
  )
  with check (
    app_role() = 'manager'
    and exists (
      select 1 from profiles p
      where p.id = schedules.employee_id and p.store_id = app_store_id()
    )
  );

create policy "schedules_write_admin" on schedules
  for all using (app_role() = 'admin') with check (app_role() = 'admin');

-- ========== attendance_records ==========
alter table attendance_records enable row level security;

create policy "attendance_select_self" on attendance_records
  for select using (employee_id = auth.uid());

create policy "attendance_select_manager" on attendance_records
  for select using (app_role() = 'manager' and store_id = app_store_id());

create policy "attendance_select_admin" on attendance_records
  for select using (app_role() = 'admin');

-- Sin policy de INSERT para anon/authenticated: los registros solo se crean
-- vía la función `mark_attendance` (SECURITY DEFINER, ver 0003).

create policy "attendance_update_admin" on attendance_records
  for update using (app_role() = 'admin') with check (app_role() = 'admin');

create policy "attendance_delete_admin" on attendance_records
  for delete using (app_role() = 'admin');
