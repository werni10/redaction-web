import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, STRIPE_PRODUCTS } from '@/lib/stripe'

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

    const returnUrl = req.headers.get('origin') || 'https://redaction.ai'

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price: STRIPE_PRODUCTS.pro_monthly,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${returnUrl}/settings?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}/settings`,
      metadata: {
        userId: user.id,
        plan,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
