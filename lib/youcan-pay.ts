import crypto from 'crypto'

const YOUCAN_PAY_PUBLIC_KEY = process.env.NEXT_PUBLIC_YOUCAN_PAY_PUBLIC_KEY
const YOUCAN_PAY_PRIVATE_KEY = process.env.YOUCAN_PAY_PRIVATE_KEY
const YOUCAN_PAY_SANDBOX_MODE = process.env.YOUCAN_PAY_SANDBOX_MODE === 'true'

// Both sandbox and live use same base — sandbox uses sandbox keys
const API_BASE = YOUCAN_PAY_SANDBOX_MODE
  ? 'https://youcanpay.com/sandbox/api'
  : 'https://youcanpay.com/api'

export interface YouCanPayCheckoutSession {
  amount: number
  currency: string
  customerEmail: string
  description: string
  successUrl: string
  failureUrl: string
}

// Step 1: Tokenize — create payment session, returns transaction_id (UUID)
export async function createCheckoutToken(
  session: YouCanPayCheckoutSession
): Promise<{ transactionId: string; amount: number }> {
  if (!YOUCAN_PAY_PRIVATE_KEY) {
    throw new Error('YouCanPay private key not configured')
  }

  const { amount, currency, successUrl, failureUrl } = session
  const orderId = crypto.randomUUID()

  // Form-encoded body
  const body = new URLSearchParams({
    amount: String(amount),
    currency: currency || 'MAD',
    pri_key: YOUCAN_PAY_PRIVATE_KEY,
    order_id: orderId,
    success_url: successUrl,
    error_url: failureUrl,
  })

  try {
    const response = await fetch(`${API_BASE}/tokenize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    const data = await response.json()
    console.log('YouCanPay tokenize raw response:', JSON.stringify(data))

    if (!response.ok || data.success === false) {
      throw new Error(`YouCanPay tokenize failed: ${JSON.stringify(data)}`)
    }

    // tokenize returns { transaction_id: "uuid", token: "cp..." }
    // token_id for /pay must be transaction_id (UUID)
    // Response format: {"token":{"id":"uuid"}}
    const transactionId = data.token?.id || data.transaction_id || data.token_id || data.id
    if (!transactionId) {
      throw new Error(`YouCanPay tokenize: no transaction_id in response. Keys: ${Object.keys(data).join(', ')}. Full: ${JSON.stringify(data)}`)
    }
    return {
      transactionId,
      amount,
    }
  } catch (err) {
    console.error('YouCanPay tokenize error:', err)
    throw err
  }
}

export interface CardDetails {
  cardNumber: string
  expireDate: string
  cvv: string
  cardholderName: string
}

// Step 2: Pay — charge card using token from tokenize
export async function processPayment(
  transactionId: string,
  cardDetails: CardDetails
): Promise<{ transactionId: string; status: string }> {
  if (!YOUCAN_PAY_PUBLIC_KEY) {
    throw new Error('YouCanPay public key not configured')
  }

  // Form-encoded body — /pay uses pub_key, not pri_key
  const body = new URLSearchParams({
    pub_key: YOUCAN_PAY_PUBLIC_KEY,
    token_id: transactionId,
    credit_card: cardDetails.cardNumber,
    card_holder_name: cardDetails.cardholderName,
    cvv: cardDetails.cvv,
    expire_date: cardDetails.expireDate,
    'payment_method[type]': 'credit_card',
  })

  try {
    const response = await fetch(`${API_BASE}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    const data = await response.json()

    if (data.success === false) {
      throw new Error(`YouCanPay payment failed: ${JSON.stringify(data)}`)
    }

    return {
      transactionId: data.transaction_id || transactionId,
      status: data.success ? 'success' : 'failed',
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
