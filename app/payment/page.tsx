'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface PaymentData {
  transactionId: string
  amount: number
  plan: string
  plan_name: string
}

interface CardDetails {
  cardNumber: string
  expireDate: string
  cvv: string
  cardholderName: string
}

export default function PaymentPage() {
  const router = useRouter()
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [cardDetails, setCardDetails] = useState<CardDetails>({
    cardNumber: '',
    expireDate: '',
    cvv: '',
    cardholderName: '',
  })
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const data = sessionStorage.getItem('youcan_pay_token')
    if (!data) {
      setError('No payment data found. Please try again.')
      setLoading(false)
      return
    }

    try {
      const parsed = JSON.parse(data) as PaymentData
      setPaymentData(parsed)
      setLoading(false)
    } catch (err) {
      setError('Invalid payment data. Please try again.')
      setLoading(false)
    }
  }, [])

  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    let formatted = value

    // Format card number (spaces every 4 digits)
    if (name === 'cardNumber') {
      formatted = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim()
    }

    // Format expiry (MM/YY)
    if (name === 'expireDate') {
      formatted = value.replace(/\D/g, '')
      if (formatted.length >= 2) {
        formatted = formatted.slice(0, 2) + '/' + formatted.slice(2, 4)
      }
    }

    // CVV (numbers only)
    if (name === 'cvv') {
      formatted = value.replace(/\D/g, '').slice(0, 4)
    }

    setCardDetails((prev) => ({
      ...prev,
      [name]: formatted,
    }))
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentData) return

    // Validate card details
    if (!cardDetails.cardNumber.replace(/\s/g, '') || cardDetails.cardNumber.length < 13) {
      setError('Card number invalid')
      return
    }
    if (!cardDetails.expireDate) {
      setError('Expiry date required')
      return
    }
    if (!cardDetails.cvv || cardDetails.cvv.length < 3) {
      setError('CVV invalid')
      return
    }
    if (!cardDetails.cardholderName.trim()) {
      setError('Cardholder name required')
      return
    }

    setProcessing(true)
    setError('')

    try {
      const res = await fetch('/api/youcan-pay/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: paymentData.transactionId,
          amount: paymentData.amount,
          plan: paymentData.plan,
          cardNumber: cardDetails.cardNumber.replace(/\s/g, ''),
          expireDate: cardDetails.expireDate,
          cvv: cardDetails.cvv,
          cardholderName: cardDetails.cardholderName,
        }),
      })

      const result = await res.json()

      if (result.error) {
        setError(result.error)
        setProcessing(false)
        return
      }

      // Clear session data
      sessionStorage.removeItem('youcan_pay_token')

      // Redirect to settings with success message
      router.push('/settings?payment=success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
      setProcessing(false)
    }
  }

  const handleCancel = () => {
    sessionStorage.removeItem('youcan_pay_token')
    router.push('/settings')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p>Chargement...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Erreur de paiement</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleCancel}
            className="w-full py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition"
          >
            Retourner aux paramètres
          </button>
        </div>
      </div>
    )
  }

  if (!paymentData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4">Erreur</h2>
          <p className="text-gray-600 mb-6">Données de paiement introuvables.</p>
          <button
            onClick={handleCancel}
            className="w-full py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition"
          >
            Retourner aux paramètres
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 px-4 py-8">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-md w-full shadow-lg">
        <h2 className="text-2xl font-bold mb-6">Informations de paiement</h2>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 mb-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-1">Plan</p>
            <p className="text-2xl font-bold">{paymentData.plan_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Montant</p>
            <p className="text-3xl font-bold text-red-600">
              {(paymentData.amount / 100).toFixed(0)} MAD
              <span className="text-sm text-gray-600 font-normal">/mois</span>
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handlePayment} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numéro de carte
            </label>
            <input
              type="text"
              name="cardNumber"
              value={cardDetails.cardNumber}
              onChange={handleCardChange}
              placeholder="4242 4242 4242 4242"
              maxLength={19}
              disabled={processing}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:bg-gray-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiration
              </label>
              <input
                type="text"
                name="expireDate"
                value={cardDetails.expireDate}
                onChange={handleCardChange}
                placeholder="MM/YY"
                maxLength={5}
                disabled={processing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CVV
              </label>
              <input
                type="text"
                name="cvv"
                value={cardDetails.cvv}
                onChange={handleCardChange}
                placeholder="123"
                maxLength={4}
                disabled={processing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:bg-gray-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du titulaire
            </label>
            <input
              type="text"
              name="cardholderName"
              value={cardDetails.cardholderName}
              onChange={(e) =>
                setCardDetails((prev) => ({
                  ...prev,
                  cardholderName: e.target.value,
                }))
              }
              placeholder="Jean Dupont"
              disabled={processing}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:bg-gray-50"
            />
          </div>

          <div className="space-y-3 pt-4">
            <button
              type="submit"
              disabled={processing}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition"
            >
              {processing ? 'Traitement...' : 'Payer maintenant'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={processing}
              className="w-full py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 disabled:opacity-50 transition"
            >
              Annuler
            </button>
          </div>
        </form>

        <p className="text-xs text-gray-500 text-center">
          Vos informations de paiement sont sécurisées par YouCanPay
        </p>
      </div>
    </div>
  )
}
