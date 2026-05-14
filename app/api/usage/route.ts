import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUsage } from '@/lib/usage'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const usage = await getUsage(user.id)
  return NextResponse.json(usage)
}
