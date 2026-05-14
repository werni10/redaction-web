import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { translateToArabic } from '@/lib/deepl'
import { polishTranslation } from '@/lib/openai'
import { countWords, incrementUsage, saveTranslation } from '@/lib/usage'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { frenchText, mode } = body as { frenchText: string; mode: 'general' | 'ocp' }

  if (!frenchText?.trim()) {
    return NextResponse.json({ error: 'frenchText required' }, { status: 400 })
  }

  if (!['general', 'ocp'].includes(mode)) {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  }

  try {
    const deeplDraft = await translateToArabic(frenchText)
    const result = await polishTranslation(frenchText, deeplDraft, mode)
    const wordCount = countWords(frenchText)

    await Promise.all([
      incrementUsage(user.id, wordCount),
      saveTranslation(user.id, mode, frenchText, result, wordCount),
    ])

    return NextResponse.json({ result, wordCount })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
