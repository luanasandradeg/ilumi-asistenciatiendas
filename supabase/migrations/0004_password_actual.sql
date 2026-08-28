-- Guarda una copia en texto plano de la contraseña vigente de cada cuenta,
-- para poder consultarla desde el Table Editor de Supabase (fuera de la app).
-- ADVERTENCIA: esto es un trade-off de seguridad deliberado, pedido
-- explícitamente por el negocio. Las Edge Functions create-employee y
-- reset-password son las únicas que escriben esta columna (con la service
-- role key). La app nunca la lee ni la muestra en pantalla.
alter table profiles add column if not exists password_actual text;
