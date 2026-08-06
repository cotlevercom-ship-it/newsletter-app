import { createClient } from '@supabase/supabase-js'

// Server-only client — uses the service role key, bypasses RLS.
// Never import this from a 'use client' component.
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )
}

// Verifies a bearer access token and returns the user, or null.
export async function getUserFromToken(accessToken) {
  if (!accessToken) return null
  const admin = supabaseAdmin()
  const { data, error } = await admin.auth.getUser(accessToken)
  if (error) return null
  return data.user
}
