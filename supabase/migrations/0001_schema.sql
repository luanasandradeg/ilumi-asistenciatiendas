-- Esquema base: locales, perfiles, horarios y registros de asistencia.

create extension if not exists "pgcrypto";

create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  latitude double precision not null,
  longitude double precision not null,
  radius_meters integer not null default 50,
  timezone text not null default 'America/Santiago',
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null default 'employee' check (role in ('admin', 'manager', 'employee')),
  store_id uuid references stores (id) on delete set null,
  employee_code text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists profiles_store_id_idx on profiles (store_id);

create table if not exists schedules (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references profiles (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  expected_start time not null,
  expected_end time not null,
  effective_from date not null default current_date,
  effective_to date
);

-- Un solo horario "vigente" (effective_to null) por empleado y día.
create unique index if not exists schedules_active_unique
  on schedules (employee_id, day_of_week)
  where effective_to is null;

create index if not exists schedules_employee_id_idx on schedules (employee_id);

create table if not exists attendance_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references profiles (id) on delete cascade,
  store_id uuid not null references stores (id),
  type text not null check (type in ('entrada', 'salida')),
  marked_at timestamptz not null default now(),
  latitude double precision not null,
  longitude double precision not null,
  distance_meters double precision not null,
  expected_time time,
  variance_minutes double precision,
  status text check (status in ('on_time', 'late', 'early'))
);

create index if not exists attendance_records_employee_id_idx on attendance_records (employee_id);
create index if not exists attendance_records_store_id_idx on attendance_records (store_id);
create index if not exists attendance_records_marked_at_idx on attendance_records (marked_at desc);
