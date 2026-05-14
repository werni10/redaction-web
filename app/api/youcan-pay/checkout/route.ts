import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { SUBSCRIPTION_AMOUNTS } from '@/lib/subscriptions'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { plan } = await req.json()

    if (plan !== 'pro' && plan !== 'enterprise') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const amount = SUBSCRIPTION_AMOUNTS[plan as keyof typeof SUBSCRIPTION_AMOUNTS]
    if (amount === 0 && plan !== 'enterprise') {
      return NextResponse.json({ error: 'Invalid plan amount' }, { status: 400 })
    }

    // Generate order ID directly (skip tokenize step)
    const orderId = crypto.randomUUID()

    // Store transaction details in session or client for payment processing
    return NextResponse.json({
      token: orderId,
      amount: amount || 0,
      orderId,
      plan,
      plan_name: plan === 'pro' ? 'Pro' : 'Enterprise',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
