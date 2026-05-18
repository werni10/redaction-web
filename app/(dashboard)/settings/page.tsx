'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PLANS, type SubscriptionPlan } from '@/lib/subscriptions'
import { Check, Settings, User, BarChart2, Mail, Sparkles, Crown } from 'lucide-react'

const PLAN_ORDER: SubscriptionPlan[] = ['free', 'starter', 'pro', 'enterprise']

const CONTACT_EMAIL = 'redaction@sainteligence.com'

function planRank(p: SubscriptionPlan) {
  return PLAN_ORDER.indexOf(p)
}

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [plan, setPlan] = useState<SubscriptionPlan>('free')
  const [usage, setUsage] = useState({ wordCount: 0, requestCount: 0, period: '' })
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  useEffect(() => {
    if (searchParams.get('payment') === 'success') setPaymentSuccess(true)
  }, [searchParams])

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
    if (newPlan === 'free' || newPlan === 'enterprise') return
    setUpgrading(newPlan)
    try {
      const res = await fetch('/api/youcan-pay/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: newPlan }),
      })
      const data = await res.json()
      if (data.error) {
        alert(`Erreur: ${data.error}`)
        return
      }
      sessionStorage.setItem('youcan_pay_token', JSON.stringify({
        transactionId: data.transactionId,
        amount: data.amount,
        plan: data.plan,
        plan_name: data.plan_name,
      }))
      window.location.href = '/payment'
    } catch {
      alert('Erreur lors de l\'initialisation du paiement')
    } finally {
      setUpgrading(null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-6 h-6 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
    </div>
  )

  const wordPct = Math.min((usage.wordCount / PLANS[plan].monthlyWords) * 100, 100)
  const reqPct = Math.min((usage.requestCount / PLANS[plan].monthlyRequests) * 100, 100)

  return (
    <div className="max-w-5xl mx-auto px-8 py-10 space-y-8">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings size={22} className="text-red-500" />
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
      </div>

      {/* Payment success banner */}
      {paymentSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-2xl px-6 py-4 flex items-center gap-3">
          <Check size={18} className="text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Paiement confirmé !</p>
            <p className="text-xs text-green-600">Votre abonnement est maintenant actif.</p>
          </div>
        </div>
      )}

      {/* Account + Usage side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Account */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <User size={16} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Compte</h2>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Email</p>
              <p className="text-sm font-medium text-gray-800">{user?.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Plan actuel</p>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700">
                {plan === 'pro' || plan === 'enterprise' ? <Crown size={11} /> : <Sparkles size={11} />}
                {PLANS[plan].name}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Membre depuis</p>
              <p className="text-sm text-gray-600">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'long', year: 'numeric',
                }) : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Usage */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 size={16} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
              Utilisation {usage.period && `— ${usage.period}`}
            </h2>
          </div>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-xs text-gray-500">Mots traités</span>
                <span className="text-xs font-semibold text-gray-700">
                  {usage.wordCount.toLocaleString()} / {PLANS[plan].monthlyWords.toLocaleString()}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${wordPct > 90 ? 'bg-red-500' : 'bg-red-400'}`}
                  style={{ width: `${wordPct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-xs text-gray-500">Requêtes</span>
                <span className="text-xs font-semibold text-gray-700">
                  {usage.requestCount} / {PLANS[plan].monthlyRequests.toLocaleString()}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${reqPct > 90 ? 'bg-red-500' : 'bg-red-400'}`}
                  style={{ width: `${reqPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plans */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-5">Plans et tarification</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(Object.entries(PLANS) as [SubscriptionPlan, typeof PLANS[SubscriptionPlan]][]).map(([planKey, planData]) => {
            const isCurrent = plan === planKey
            const isUpgrade = planRank(planKey) > planRank(plan)
            const isEnterprise = planKey === 'enterprise'

            return (
              <div
                key={planKey}
                className={`rounded-2xl border-2 p-6 flex flex-col transition-all ${
                  isCurrent
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {/* Plan name + current badge */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-base">{planData.name}</h3>
                  {isCurrent && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 uppercase tracking-wide">
                      Actuel
                    </span>
                  )}
                </div>

                {/* Price */}
                <div className="mb-5">
                  {isEnterprise ? (
                    <span className="text-2xl font-bold text-gray-800">Sur mesure</span>
                  ) : planData.price > 0 ? (
                    <>
                      <span className="text-3xl font-bold text-gray-900">{planData.price}</span>
                      <span className="text-sm text-gray-500 ml-1">MAD/mois</span>
                    </>
                  ) : (
                    <span className="text-2xl font-bold text-gray-800">Gratuit</span>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-6 flex-1">
                  {planData.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check size={14} className="text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isCurrent ? (
                  <div className="w-full py-2.5 rounded-xl text-center text-sm font-semibold bg-gray-100 text-gray-400">
                    Plan actuel
                  </div>
                ) : isEnterprise ? (
                  <a
                    href={`mailto:${CONTACT_EMAIL}?subject=RedAction Enterprise — Demande&body=Bonjour,%0A%0AJe souhaite obtenir plus d'informations sur le plan Enterprise de RedAction.%0A%0AMon email: ${user?.email || ''}%0A%0AMerci`}
                    className="w-full py-2.5 rounded-xl text-center text-sm font-semibold bg-gray-900 text-white hover:bg-gray-700 transition flex items-center justify-center gap-2"
                  >
                    <Mail size={14} />
                    Nous contacter
                  </a>
                ) : isUpgrade ? (
                  <button
                    onClick={() => handleUpgrade(planKey)}
                    disabled={upgrading === planKey}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {upgrading === planKey ? 'Chargement…' : `Passer à ${planData.name}`}
                  </button>
                ) : (
                  <div className="w-full py-2.5 rounded-xl text-center text-sm font-semibold bg-gray-100 text-gray-400">
                    Plan inférieur
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
