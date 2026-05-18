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

    if (!['starter', 'pro', 'enterprise'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const amountMAD = SUBSCRIPTION_AMOUNTS[plan as keyof typeof SUBSCRIPTION_AMOUNTS]
    // YouCanPay expects amount in centimes (1 MAD = 100 centimes)
    const amount = (amountMAD || 0) * 100
    const returnUrl = req.headers.get('origin') || 'https://redaction.ai'

    const token = await createCheckoutToken({
      amount,
      currency: 'MAD',
      customerEmail: user.email || '',
      description: `RedAction ${plan} subscription`,
      successUrl: `${returnUrl}/settings?payment=success`,
      failureUrl: `${returnUrl}/settings?payment=failed`,
    })

    if (!token.transactionId) {
      return NextResponse.json({ error: 'YouCanPay did not return a transaction_id', raw: token }, { status: 500 })
    }

    return NextResponse.json({
      transactionId: token.transactionId,
      amount: token.amount,
      plan,
      plan_name: plan === 'pro' ? 'Pro' : 'Enterprise',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
