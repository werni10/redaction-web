import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { processPayment } from '@/lib/youcan-pay'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { transactionId, amount, plan, cardNumber, expireDate, cvv, cardholderName } = await req.json()

    if (!transactionId || !amount || !plan) {
      return NextResponse.json({
        error: 'Missing required fields',
        debug: { transactionId: !!transactionId, amount: !!amount, plan: !!plan }
      }, { status: 400 })
    }

    if (!cardNumber || !expireDate || !cvv || !cardholderName) {
      return NextResponse.json({ error: 'Missing card details' }, { status: 400 })
    }

    const paymentResult = await processPayment(transactionId, {
      cardNumber,
      expireDate,
      cvv,
      cardholderName,
    })

    // Calculate subscription period (30 days)
    const now = new Date()
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Use service role to bypass RLS
    const serviceSupabase = await createServiceClient()
    const { error: upsertError } = await serviceSupabase
      .from('user_subscriptions')
      .upsert(
        {
          user_id: user.id,
          plan,
          youcan_pay_transaction_id: paymentResult.transactionId,
          youcan_pay_customer_email: user.email,
          status: 'active',
          renewal_status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: endDate.toISOString(),
          updated_at: now.toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (upsertError) {
      console.error('Subscription upsert error:', JSON.stringify(upsertError))
      return NextResponse.json({ error: 'Failed to activate subscription', debug: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      transactionId: paymentResult.transactionId,
      plan,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Payment processing error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
