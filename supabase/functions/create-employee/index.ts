// Edge Function: crea una cuenta de empleado (auth.users + profiles).
// Se ejecuta con la service role key (nunca expuesta al navegador) porque
// crear usuarios de Auth requiere privilegios que el anon key no tiene.
// Solo admin o manager pueden invocarla; un manager solo puede crear
// empleados (rol 'employee') en su propio local. Solo el admin puede
// crear cuentas con rol 'manager' (líder).
//
// Deploy: supabase functions deploy create-employee
// Requiere los secrets SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (Supabase
// los inyecta automáticamente en runtime, no hace falta configurarlos a mano).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function randomPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9))
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, '').slice(0, 10)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: userData, error: userErr } = await admin.auth.getUser(token)
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: caller, error: callerErr } = await admin
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single()

    if (callerErr || !caller || !['admin', 'manager'].includes(caller.role)) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const email = String(body.email ?? '').trim().toLowerCase()
    const full_name = String(body.full_name ?? '').trim()
    const employee_code = body.employee_code ? String(body.employee_code).trim() : null
    let store_id = body.store_id ? String(body.store_id) : null
    const requestedRole = body.role === 'manager' ? 'manager' : 'employee'

    if (!email || !full_name) {
      return new Response(JSON.stringify({ error: 'Faltan email o nombre' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (requestedRole === 'manager' && caller.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Solo el admin puede crear líderes' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (caller.role === 'manager') {
      store_id = caller.store_id
    }
    if (!store_id) {
      return new Response(JSON.stringify({ error: 'Falta el local' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const password = randomPassword()

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    })

    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message ?? 'No se pudo crear el usuario' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { error: profileErr } = await admin.from('profiles').insert({
      id: created.user.id,
      full_name,
      role: requestedRole,
      store_id,
      employee_code,
      active: true,
    })

    if (profileErr) {
      await admin.auth.admin.deleteUser(created.user.id)
      return new Response(JSON.stringify({ error: profileErr.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ id: created.user.id, email, temp_password: password }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
