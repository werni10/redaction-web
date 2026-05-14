import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCheckoutToken } from '@/lib/youcan-pay'
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

    const returnUrl = req.headers.get('origin') || 'https://redaction.ai'

    const token = await createCheckoutToken({
      amount: amount || 0,
      currency: 'USD',
      customerEmail: user.email || '',
      customerId: user.id,
      description: `RedAction ${plan} subscription`,
      successUrl: `${returnUrl}/settings?payment=success`,
      failureUrl: `${returnUrl}/settings?payment=failed`,
      webhookUrl: `${returnUrl}/api/youcan-pay/webhooks`,
    })

    // Store transaction token in session or client for payment processing
    return NextResponse.json({
      token: token.token,
      amount: token.amount,
      plan,
      plan_name: plan === 'pro' ? 'Pro' : 'Enterprise',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
