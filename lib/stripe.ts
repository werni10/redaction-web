import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-10-28.acacia',
})

export const STRIPE_PRODUCTS = {
  pro_monthly: 'price_pro_monthly',
  enterprise_annual: 'price_enterprise_annual',
}

export async function createCheckoutSession(
  userId: string,
  email: string,
  plan: 'pro',
  returnUrl: string
) {
  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    payment_method_types: ['card'],
    line_items: [
      {
        price: STRIPE_PRODUCTS.pro_monthly,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: returnUrl,
    metadata: {
      userId,
      plan,
    },
  })

  return session
}

export async function getSubscriptionStatus(customerId: string) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 1,
  })

  if (subscriptions.data.length === 0) return null

  const subscription = subscriptions.data[0]
  return {
    id: subscription.id,
    status: subscription.status,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    plan: subscription.metadata?.plan || 'free',
  }
}
