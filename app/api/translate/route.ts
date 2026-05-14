import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { translateToArabic } from '@/lib/deepl'
import { polishTranslation } from '@/lib/openai'
import { countWords, incrementUsage, saveTranslation, getUsage } from '@/lib/usage'
import { hasExceededLimit } from '@/lib/subscriptions'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { frenchText } = body as { frenchText: string }

  if (!frenchText?.trim()) {
    return NextResponse.json({ error: 'frenchText required' }, { status: 400 })
  }

  // Check usage limits and subscription
  const [usage, { data: profile }] = await Promise.all([
    getUsage(user.id),
    supabase
      .from('user_subscriptions')
      .select('plan, status, current_period_end')
      .eq('user_id', user.id)
      .single(),
  ])

  const plan = (profile?.plan || 'free') as 'free' | 'pro' | 'enterprise'

  // Check if subscription expired
  if (plan !== 'free' && profile?.status === 'active' && profile?.current_period_end) {
    if (new Date(profile.current_period_end) < new Date()) {
      return NextResponse.json(
        { error: 'Subscription expired. Please renew to continue.' },
        { status: 403 }
      )
    }
  }

  const wordCount = countWords(frenchText)

  if (usage.wordCount + wordCount > (plan === 'free' ? 5000 : plan === 'pro' ? 100000 : 1000000)) {
    return NextResponse.json(
      { error: `Monthly limit exceeded for ${plan} plan` },
      { status: 429 }
    )
  }

  try {
    const deeplDraft = await translateToArabic(frenchText)
    const result = await polishTranslation(frenchText, deeplDraft, 'general')

    await Promise.all([
      incrementUsage(user.id, wordCount),
      saveTranslation(user.id, 'general', frenchText, result, wordCount),
    ])

    return NextResponse.json({ result, wordCount })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
