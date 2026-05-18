'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PLANS, type SubscriptionPlan } from '@/lib/subscriptions'
import { Check, Settings, User, BarChart2 } from 'lucide-react'
import { getUsage } from '@/lib/usage'

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [plan, setPlan] = useState<SubscriptionPlan>('free')
  const [usage, setUsage] = useState({ wordCount: 0, requestCount: 0, period: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setUser(user)
        const res = await fetch('/api/usage')
        const data = await res.json()
        setPlan(data.plan || 'free')
        setUsage(data)
      }
      setLoading(false)
    })
  }, [])

  const handleUpgrade = async (newPlan: SubscriptionPlan) => {
    if (newPlan === 'free') return
    setLoading(true)
    try {
      const res = await fetch('/api/youcan-pay/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: newPlan }),
      })
      const data = await res.json()
      if (data.error) {
        alert(`Error: ${data.error}`)
        return
      }

      // Store payment details and redirect to payment page
      sessionStorage.setItem('youcan_pay_token', JSON.stringify({
        transactionId: data.transactionId,
        amount: data.amount,
        plan: data.plan,
        plan_name: data.plan_name,
      }))
      window.location.href = '/payment'
    } catch (err) {
      console.error(err)
      alert('Failed to initiate payment')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8">Chargement...</div>

  return (
    <div className="max-w-4xl mx-auto px-8 py-10 space-y-10">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Settings size={24} className="text-pink-500" />
          <h1 className="text-3xl font-bold">Paramètres</h1>
        </div>
        <p className="text-gray-500">Gérez votre compte et votre abonnement</p>
      </div>

      {/* Account */}
      <div className="bg-white border border-gray-100 rounded-2xl p-8 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <User size={18} className="text-purple-500" />
          <h2 className="text-lg font-semibold">Compte</h2>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Email</p>
            <p className="text-sm font-medium text-gray-800">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Membre depuis</p>
            <p className="text-sm text-gray-600">
              {new Date(user?.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Usage */}
      <div className="bg-white border border-gray-100 rounded-2xl p-8 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 size={18} className="text-pink-500" />
          <h2 className="text-lg font-semibold">Utilisation — {usage.period}</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6">
            <p className="text-4xl font-bold text-gray-800">{usage.wordCount.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-2">mots traités</p>
            <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                style={{
                  width: `${Math.min((usage.wordCount / PLANS[plan].monthlyWords) * 100, 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {PLANS[plan].monthlyWords.toLocaleString()} par mois
            </p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6">
            <p className="text-4xl font-bold text-gray-800">{usage.requestCount}</p>
            <p className="text-sm text-gray-500 mt-2">requêtes</p>
            <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                style={{
                  width: `${Math.min((usage.requestCount / PLANS[plan].monthlyRequests) * 100, 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {PLANS[plan].monthlyRequests.toLocaleString()} par mois
            </p>
          </div>
        </div>
      </div>

      {/* Plans */}
      <div>
        <h2 className="text-2xl font-semibold mb-6">Plans et tarification</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(PLANS).map(([planKey, planData]) => {
            const isPlan = plan === planKey
            const isHigherPlan =
              (plan === 'free' && planKey !== 'free') ||
              (plan === 'pro' && planKey === 'enterprise')

            return (
              <div
                key={planKey}
                className={`rounded-2xl border-2 p-8 transition-all ${
                  isPlan
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <h3 className="font-bold text-xl">{planData.name}</h3>
                <div className="mt-4 mb-8">
                  {planData.price > 0 ? (
                    <>
                      <span className="text-4xl font-bold">{planData.price}</span>
                      <span className="text-gray-500 ml-1">MAD/mois</span>
                    </>
                  ) : (
                    <span className="text-4xl font-bold">Gratuit</span>
                  )}
                </div>

                <div className="space-y-4 mb-8">
                  {planData.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <Check size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleUpgrade(planKey as SubscriptionPlan)}
                  disabled={isPlan || loading}
                  className={`w-full py-3 rounded-xl font-semibold transition ${
                    isPlan
                      ? 'bg-gray-100 text-gray-500 cursor-default'
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 disabled:opacity-50'
                  }`}
                >
                  {isPlan ? 'Plan actuel' : isHigherPlan ? `Passer à ${planData.name}` : 'Gratuit'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
