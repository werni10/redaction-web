export type SubscriptionPlan = 'free' | 'starter' | 'pro' | 'enterprise'

export interface PlanLimits {
  monthlyWords: number
  monthlyRequests: number
  name: string
  price: number
  features: string[]
}

export const PLANS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    monthlyWords: 3000,
    monthlyRequests: 30,
    name: 'Gratuit',
    price: 0,
    features: [
      '3 000 mots/mois',
      'Traduction FR → AR',
      'Réécriture AR',
      'Historique 7 jours',
    ],
  },
  starter: {
    monthlyWords: 20000,
    monthlyRequests: 400,
    name: 'Starter',
    price: 19,
    features: [
      '20 000 mots/mois',
      'Traduction FR → AR',
      'Réécriture AR',
      'Historique complet',
      'Favoris & Dossiers',
    ],
  },
  pro: {
    monthlyWords: 100000,
    monthlyRequests: 2000,
    name: 'Pro',
    price: 79,
    features: [
      '100 000 mots/mois',
      'Traduction FR → AR',
      'Réécriture AR',
      'Historique complet',
      'Favoris & Dossiers',
      'Support prioritaire',
    ],
  },
  enterprise: {
    monthlyWords: 1000000,
    monthlyRequests: 20000,
    name: 'Enterprise',
    price: 0,
    features: [
      '1 000 000 mots/mois',
      'Accès API',
      'Support dédié 24/7',
      'SLA personnalisé',
      'Onboarding inclus',
    ],
  },
}

export function hasExceededLimit(
  plan: SubscriptionPlan,
  usage: { wordCount: number; requestCount: number }
): { exceeded: boolean; type?: 'words' | 'requests' } {
  const limits = PLANS[plan]
  if (usage.wordCount >= limits.monthlyWords) return { exceeded: true, type: 'words' }
  if (usage.requestCount >= limits.monthlyRequests) return { exceeded: true, type: 'requests' }
  return { exceeded: false }
}

// YouCanPay payment amounts (in MAD cents)
export const SUBSCRIPTION_AMOUNTS: Record<SubscriptionPlan, number> = {
  free: 0,
  starter: 1900,  // 19 MAD
  pro: 7900,      // 79 MAD
  enterprise: 0,  // custom
}
