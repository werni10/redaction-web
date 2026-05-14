'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface PaymentData {
  token: string
  amount: number
  plan: string
  plan_name: string
}

export default function PaymentPage() {
  const router = useRouter()
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [loading, setLoading] = useState(true)
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

  const handlePayment = async () => {
    if (!paymentData) return

    setLoading(true)
    try {
      const res = await fetch('/api/youcan-pay/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: paymentData.token,
          amount: paymentData.amount,
          plan: paymentData.plan,
        }),
      })

      const result = await res.json()

      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      // Clear session data
      sessionStorage.removeItem('youcan_pay_token')

      // Redirect to settings with success message
      router.push('/settings?payment=success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
      setLoading(false)
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 px-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-md w-full shadow-lg">
        <h2 className="text-2xl font-bold mb-6">Confirmer le paiement</h2>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 mb-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-1">Plan</p>
            <p className="text-2xl font-bold">{paymentData.plan_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Montant</p>
            <p className="text-3xl font-bold text-pink-600">
              ${(paymentData.amount / 100).toFixed(2)}
              <span className="text-sm text-gray-600 font-normal">/mois</span>
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <button
            onClick={handlePayment}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition"
          >
            {loading ? 'Traitement...' : 'Payer maintenant'}
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="w-full py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 disabled:opacity-50 transition"
          >
            Annuler
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          Vos informations de paiement sont sécurisées par YouCanPay
        </p>
      </div>
    </div>
  )
}
