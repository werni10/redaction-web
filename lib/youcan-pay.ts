import crypto from 'crypto'

const YOUCAN_PAY_PUBLIC_KEY = process.env.NEXT_PUBLIC_YOUCAN_PAY_PUBLIC_KEY
const YOUCAN_PAY_PRIVATE_KEY = process.env.YOUCAN_PAY_PRIVATE_KEY
const YOUCAN_PAY_SANDBOX_MODE = process.env.YOUCAN_PAY_SANDBOX_MODE === 'true'

const API_BASE = YOUCAN_PAY_SANDBOX_MODE
  ? 'https://youcanpay.com/sandbox/api'
  : 'https://api.youcanpay.com/v1'

export interface YouCanPayCheckoutSession {
  amount: number
  currency: string
  customerEmail: string
  customerId: string
  description: string
  successUrl: string
  failureUrl: string
  webhookUrl: string
}

export async function createCheckoutToken(
  session: YouCanPayCheckoutSession
): Promise<{ token: string; amount: number; orderId: string }> {
  if (!YOUCAN_PAY_PRIVATE_KEY) {
    throw new Error('YouCanPay private key not configured')
  }

  const { amount, currency, customerEmail, description, customerId } = session
  const orderId = `order_${customerId}_${Date.now()}`

  try {
    const response = await fetch(`${API_BASE}/tokenize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency: currency || 'USD',
        customer_email: customerEmail,
        description,
        order_id: orderId,
        pri_key: YOUCAN_PAY_PRIVATE_KEY,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`YouCanPay tokenize failed: ${JSON.stringify(error)}`)
    }

    const data = await response.json()
    return {
      token: data.token || data.id,
      amount,
      orderId,
    }
  } catch (err) {
    console.error('YouCanPay tokenize error:', err)
    throw err
  }
}

export async function processPayment(
  token: string,
  amount: number,
  customerEmail: string
): Promise<{ transactionId: string; status: string }> {
  if (!YOUCAN_PAY_PRIVATE_KEY) {
    throw new Error('YouCanPay private key not configured')
  }

  try {
    const response = await fetch(`${API_BASE}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        amount,
        customer_email: customerEmail,
        pri_key: YOUCAN_PAY_PRIVATE_KEY,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`YouCanPay payment failed: ${JSON.stringify(error)}`)
    }

    const data = await response.json()
    return {
      transactionId: data.id || data.transaction_id,
      status: data.status || 'success',
    }
  } catch (err) {
    console.error('YouCanPay payment error:', err)
    throw err
  }
}

export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  if (!YOUCAN_PAY_PRIVATE_KEY) return false

  const hash = crypto
    .createHmac('sha256', YOUCAN_PAY_PRIVATE_KEY)
    .update(payload)
    .digest('hex')

  return hash === signature
}

export const YOUCAN_PAY_PRODUCTS = {
  pro_monthly: 'pro_monthly',
  enterprise_annual: 'enterprise_annual',
}
