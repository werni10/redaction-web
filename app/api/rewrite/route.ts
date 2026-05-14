import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rewriteArabic } from '@/lib/openai'
import { countWords, incrementUsage, saveTranslation } from '@/lib/usage'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { arabicText } = body as { arabicText: string }

  if (!arabicText?.trim()) {
    return NextResponse.json({ error: 'arabicText required' }, { status: 400 })
  }

  try {
    const result = await rewriteArabic(arabicText)
    const wordCount = countWords(arabicText)

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
