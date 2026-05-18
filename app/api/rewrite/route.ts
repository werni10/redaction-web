import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rewriteArabic } from '@/lib/openai'
import { countWords, incrementUsage, saveTranslation, getUsage } from '@/lib/usage'

const WORD_LIMITS: Record<string, number> = {
  free: 5000,
  starter: 20000,
  pro: 100000,
  enterprise: 1000000,
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { arabicText } = body as { arabicText: string }
  if (!arabicText?.trim()) return NextResponse.json({ error: 'arabicText required' }, { status: 400 })

  const wordCount = countWords(arabicText)
  const [usage, { data: profile }] = await Promise.all([
    getUsage(user.id),
    supabase.from('user_subscriptions').select('plan, status, current_period_end').eq('user_id', user.id).single(),
  ])

  const plan = profile?.plan || 'free'

  if (plan !== 'free' && profile?.current_period_end) {
    if (new Date(profile.current_period_end) < new Date()) {
      return NextResponse.json({ error: 'Subscription expired. Please renew.' }, { status: 403 })
    }
  }

  const limit = WORD_LIMITS[plan] ?? 5000
  if (usage.wordCount + wordCount > limit) {
    return NextResponse.json({ error: `Limite mensuelle atteinte (plan ${plan})` }, { status: 429 })
  }

  // ── Cache check ────────────────────────────────────────────────────────────
  const { data: cached } = await supabase
    .from('translations')
    .select('result_text, word_count')
    .eq('user_id', user.id)
    .eq('mode', 'arabic_rewrite')
    .eq('source_text', arabicText.trim())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (cached?.result_text) {
    return NextResponse.json({ result: cached.result_text, wordCount: cached.word_count ?? wordCount, cached: true })
  }

  try {
    const result = await rewriteArabic(arabicText)

    await Promise.all([
      incrementUsage(user.id, wordCount),
      saveTranslation(user.id, 'arabic_rewrite', arabicText, result, wordCount),
    ])

    return NextResponse.json({ result, wordCount })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
