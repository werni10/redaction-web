export type SubscriptionPlan = 'free' | 'pro' | 'enterprise'

export interface PlanLimits {
  monthlyWords: number
  monthlyRequests: number
  name: string
  price: number
  features: string[]
}

export const PLANS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    monthlyWords: 5000,
    monthlyRequests: 50,
    name: 'Gratuit',
    price: 0,
    features: [
      'Traduction FR → AR (Redouane)',
      'Réécriture AR',
      '5,000 mots/mois',
      'Historique limité',
    ],
  },
  pro: {
    monthlyWords: 100000,
    monthlyRequests: 2000,
    name: 'Pro',
    price: 99,
    features: [
      'Traduction FR → AR illimitée',
      'Réécriture AR illimitée',
      '100,000 mots/mois',
      'Historique complet',
      'Export PDF',
      'Support prioritaire',
    ],
  },
  enterprise: {
    monthlyWords: 1000000,
    monthlyRequests: 10000,
    name: 'Enterprise',
    price: 0,
    features: [
      'Traduction FR → AR illimitée',
      'Réécriture AR illimitée',
      '1,000,000 mots/mois',
      'API access',
      'Support 24/7',
      'Custom SLA',
    ],
  },
}

export function getPlanFromRequest(plan: string): SubscriptionPlan {
  if (plan === 'pro' || plan === 'enterprise') return plan as SubscriptionPlan
  return 'free'
}

export function hasExceededLimit(plan: SubscriptionPlan, usage: {
  wordCount: number
  requestCount: number
}): { exceeded: boolean; type?: 'words' | 'requests' } {
  const limits = PLANS[plan]
  if (usage.wordCount >= limits.monthlyWords) return { exceeded: true, type: 'words' }
  if (usage.requestCount >= limits.monthlyRequests) return { exceeded: true, type: 'requests' }
  return { exceeded: false }
}
