// Edge Function: cambia la contraseña de un empleado/líder que ya existe.
// Si el body trae `new_password` se usa esa (mínimo 6 caracteres); si no,
// se genera una aleatoria. Misma lógica de autorización que create-employee:
// admin o manager (el manager solo puede resetear empleados de su propio local).
//
// Deploy: supabase functions deploy reset-password

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function randomPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9))
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, '').slice(0, 10)
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) return json({ error: 'No autenticado' }, 401)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: userData, error: userErr } = await admin.auth.getUser(token)
    if (userErr || !userData.user) return json({ error: 'Token inválido' }, 401)

    const { data: caller, error: callerErr } = await admin
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single()

    if (callerErr || !caller || !['admin', 'manager'].includes(caller.role)) {
      return json({ error: 'No autorizado' }, 403)
    }

    const body = await req.json()
    const employee_id = String(body.employee_id ?? '')
    if (!employee_id) return json({ error: 'Falta employee_id' }, 400)

    const { data: target, error: targetErr } = await admin
      .from('profiles')
      .select('*')
      .eq('id', employee_id)
      .single()

    if (targetErr || !target) return json({ error: 'Cuenta no encontrada' }, 404)

    if (caller.role === 'manager') {
      if (target.role !== 'employee' || target.store_id !== caller.store_id) {
        return json({ error: 'No autorizado' }, 403)
      }
    } else if (target.role === 'admin') {
      return json({ error: 'No se puede resetear la contraseña de otro admin' }, 403)
    }

    const customPassword = body.new_password ? String(body.new_password) : null
    if (customPassword && customPassword.length < 6) {
      return json({ error: 'La contraseña debe tener al menos 6 caracteres' }, 400)
    }
    const password = customPassword ?? randomPassword()
    const { error: updateErr } = await admin.auth.admin.updateUserById(employee_id, { password })
    if (updateErr) return json({ error: updateErr.message }, 400)

    await admin.from('profiles').update({ password_actual: password }).eq('id', employee_id)

    return json({ temp_password: password })
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})
