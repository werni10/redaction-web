import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUsage } from '@/lib/usage'
import { PLANS, hasExceededLimit } from '@/lib/subscriptions'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [usage, { data: profile }] = await Promise.all([
    getUsage(user.id),
    supabase
      .from('user_subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .single(),
  ])

  const plan = (profile?.plan || 'free') as 'free' | 'pro' | 'enterprise'
  const limits = PLANS[plan]
  const exceeded = hasExceededLimit(plan, usage)

  return NextResponse.json({
    ...usage,
    plan,
    limits,
    exceeded,
  })
}
