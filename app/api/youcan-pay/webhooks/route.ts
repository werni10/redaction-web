import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyWebhookSignature } from '@/lib/youcan-pay'

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-youcan-pay-signature') || ''
    const body = await req.text()

    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const data = JSON.parse(body)
    const supabase = await createClient()

    // Handle payment success
    if (data.type === 'payment.succeeded' || data.status === 'success') {
      const { customer_email, transaction_id, amount, metadata } = data

      // Calculate subscription period (1 month from now)
      const now = new Date()
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      // Get user by email
      const { data: users } = await supabase.auth.admin.listUsers()
      const user = users?.users.find((u) => u.email === customer_email)

      if (!user) {
        console.error(`User not found for email: ${customer_email}`)
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      // Determine plan from metadata or amount
      let plan = metadata?.plan || 'pro'
      if (amount && amount > 15000) plan = 'enterprise'

      // Create or update subscription
      const { error: upsertError } = await supabase
        .from('user_subscriptions')
        .upsert(
          {
            user_id: user.id,
            plan,
            youcan_pay_transaction_id: transaction_id,
            youcan_pay_customer_email: customer_email,
            status: 'active',
            renewal_status: 'active',
            current_period_start: now.toISOString(),
            current_period_end: endDate.toISOString(),
            updated_at: now.toISOString(),
          },
          { onConflict: 'user_id' }
        )

      if (upsertError) {
        console.error('Upsert subscription error:', upsertError)
        return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    // Handle payment failure
    if (data.type === 'payment.failed' || data.status === 'failed') {
      console.warn('Payment failed:', data)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
