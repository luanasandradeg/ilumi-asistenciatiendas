# Asistencia Tiendas

Plataforma de marcado de asistencia por geolocalización. React + Vite + Tailwind en el
frontend, Supabase (Postgres + Auth + Edge Functions) como backend.

## 1. Crear el proyecto en Supabase

1. Entra a [supabase.com](https://supabase.com) → **New project**.
2. Cuando esté listo, en **Project Settings → API** copia `Project URL` y la `anon public key`.
3. Abre el **SQL Editor** y ejecuta, en orden, los archivos de `supabase/migrations/`:
   - `0001_schema.sql`
   - `0002_rls_policies.sql`
   - `0003_mark_attendance.sql`

## 2. Configurar variables de entorno locales

```
cp .env.example .env
```

Completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los valores del paso 1.

## 3. Deploy de la Edge Function `create-employee`

Esta función es la que crea las cuentas de los empleados (necesita la service role
key, que nunca se expone al navegador). Requiere la [Supabase CLI](https://supabase.com/docs/guides/cli):

```
npx supabase login
npx supabase link --project-ref <tu-project-ref>
npx supabase functions deploy create-employee
```

Supabase inyecta `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` automáticamente en runtime,
no hace falta configurarlos a mano.

## 4. Crear el primer usuario administrador

El admin general no se puede crear desde la app (todavía no existe nadie con permiso
para invocar `create-employee`), así que se hace a mano una única vez:

1. **Authentication → Users → Add user** en el dashboard de Supabase. Carga email y contraseña.
2. Copia el `UID` del usuario creado.
3. En el **SQL Editor**:
   ```sql
   insert into profiles (id, full_name, role)
   values ('<UID_COPIADO>', 'Nombre del admin', 'admin');
   ```

Desde ahí, ese admin ya puede crear locales, encargados (con `role: 'manager'`, mismo
mecanismo manual la primera vez, o subiendo el nivel de un empleado existente vía SQL:
`update profiles set role = 'manager' where id = '...'`) y empleados desde el panel.

## 5. Correr en local

```
npm install
npm run dev
```

> **Nota sobre geolocalización:** el navegador solo permite `navigator.geolocation` en
> contextos seguros (HTTPS o `localhost`). Probar desde `http://localhost` en tu PC
> funciona bien; para probar desde un celular en la red local vas a necesitar HTTPS
> (por eso el flujo real de los empleados es contra la URL ya desplegada en Railway).

## 6. Deploy en Railway

1. `npm i -g @railway/cli` y `railway login`.
2. `railway init` (o conecta el repo desde el dashboard de Railway si prefieres deploy
   automático en cada push).
3. Configura las variables de **build** en el proyecto de Railway: `VITE_SUPABASE_URL`
   y `VITE_SUPABASE_ANON_KEY` (Vite las incrusta en el build, no son variables de
   runtime).
4. `railway up`.

`railway.json` ya define el build (`npm ci && npm run build`) y el arranque
(`npm run start`, que sirve `dist/` con `serve` y respeta el fallback de rutas de
`react-router-dom`).

## Notas de diseño

- La distancia al local se valida **en el servidor** (función `mark_attendance` en
  Postgres), no solo en el navegador — un chequeo únicamente client-side se puede
  saltear editando el JS.
- Tolerancia de horario: se considera "a horario" una diferencia de hasta 5 minutos.
  Ajustable en `supabase/migrations/0003_mark_attendance.sql`.
- Cada local tiene su propia zona horaria (`stores.timezone`, default
  `America/Santiago`) para calcular correctamente el día de la semana y el horario
  esperado.
