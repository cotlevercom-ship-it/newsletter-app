import { NextResponse } from 'next/server'
import { supabaseAdmin, getUserFromToken } from '@/lib/supabase-admin'

export async function GET(request, { params }) {
  const { id } = params
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '')

  const user = await getUserFromToken(token)
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const admin = supabaseAdmin()

  // Must have an active subscription
  const { data: sub } = await admin
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (!sub) {
    return NextResponse.json({ error: 'Active subscription required' }, { status: 403 })
  }

  const { data: pub, error: pubError } = await admin
    .from('publications')
    .select('*')
    .eq('id', id)
    .single()

  if (pubError || !pub) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Short-lived signed URL (5 minutes) — re-requested by the viewer as needed, never a permanent link
  const { data: signed, error: signError } = await admin.storage
    .from('publications')
    .createSignedUrl(pub.file_path, 300)

  if (signError || !signed) {
    return NextResponse.json({ error: 'Could not generate file link' }, { status: 500 })
  }

  return NextResponse.json({
    title: pub.title,
    type: pub.type,
    url: signed.signedUrl,
  })
}
