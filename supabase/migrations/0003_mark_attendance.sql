-- Función RPC que registra una marca de entrada/salida.
-- Corre como SECURITY DEFINER para poder leer store/schedule del empleado y
-- escribir en attendance_records aunque esa tabla no tenga policy de INSERT
-- para roles anon/authenticated. El empleado se identifica con auth.uid(),
-- nunca se recibe employee_id como parámetro, para que nadie pueda marcar
-- asistencia en nombre de otra persona.
--
-- Umbral de tolerancia: +/- 5 minutos se considera "on_time". Ajustable acá
-- si el negocio necesita otro margen.

create or replace function mark_attendance(
  p_type text,
  p_lat double precision,
  p_lng double precision
)
returns attendance_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee_id uuid := auth.uid();
  v_profile profiles;
  v_store stores;
  v_distance double precision;
  v_local_ts timestamp;
  v_dow smallint;
  v_schedule schedules;
  v_expected time;
  v_variance double precision;
  v_status text;
  v_record attendance_records;
begin
  if v_employee_id is null then
    raise exception 'No autenticado';
  end if;

  if p_type not in ('entrada', 'salida') then
    raise exception 'Tipo de marca inválido: %', p_type;
  end if;

  select * into v_profile from profiles where id = v_employee_id;
  if v_profile is null or v_profile.active = false then
    raise exception 'Cuenta inactiva o no encontrada';
  end if;
  if v_profile.store_id is null then
    raise exception 'No tienes un local asignado, contacta a tu encargado';
  end if;

  select * into v_store from stores where id = v_profile.store_id;

  -- Haversine
  v_distance := 2 * 6371000 * asin(sqrt(
    power(sin(radians(p_lat - v_store.latitude) / 2), 2) +
    cos(radians(v_store.latitude)) * cos(radians(p_lat)) *
    power(sin(radians(p_lng - v_store.longitude) / 2), 2)
  ));

  if v_distance > v_store.radius_meters then
    raise exception 'Estás a % m del local, fuera del rango permitido (% m)',
      round(v_distance::numeric, 0), v_store.radius_meters;
  end if;

  v_local_ts := now() at time zone v_store.timezone;
  v_dow := extract(dow from v_local_ts);

  select * into v_schedule from schedules
    where employee_id = v_employee_id
      and day_of_week = v_dow
      and effective_to is null
    limit 1;

  if found then
    v_expected := case when p_type = 'entrada' then v_schedule.expected_start else v_schedule.expected_end end;
    v_variance := extract(epoch from (v_local_ts::time - v_expected)) / 60.0;
    -- Entrada: solo puede quedar "a horario" o "tarde" (llegar antes no se marca).
    -- Salida: solo puede quedar "a horario" o "temprano" (irse después no se marca).
    if p_type = 'entrada' then
      v_status := case when v_variance > 5 then 'late' else 'on_time' end;
    else
      v_status := case when v_variance < -5 then 'early' else 'on_time' end;
    end if;
  else
    v_expected := null;
    v_variance := null;
    v_status := null;
  end if;

  insert into attendance_records (
    employee_id, store_id, type, marked_at, latitude, longitude,
    distance_meters, expected_time, variance_minutes, status
  ) values (
    v_employee_id, v_store.id, p_type, now(), p_lat, p_lng,
    v_distance, v_expected, v_variance, v_status
  )
  returning * into v_record;

  return v_record;
end;
$$;

grant execute on function mark_attendance(text, double precision, double precision) to authenticated;
