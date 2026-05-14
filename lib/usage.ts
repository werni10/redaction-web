import { createServiceClient } from '@/lib/supabase/server'

export function currentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export async function getUsage(userId: string) {
  const supabase = await createServiceClient()
  const period = currentPeriod()

  const { data } = await supabase
    .from('usage')
    .select('word_count, request_count')
    .eq('user_id', userId)
    .eq('period', period)
    .single()

  return {
    wordCount: data?.word_count ?? 0,
    requestCount: data?.request_count ?? 0,
    period,
  }
}

export async function incrementUsage(userId: string, wordCount: number) {
  const supabase = await createServiceClient()
  const period = currentPeriod()

  await supabase.rpc('increment_usage', {
    p_user_id: userId,
    p_period: period,
    p_words: wordCount,
  })
}

export async function saveTranslation(
  userId: string,
  mode: string,
  sourceText: string,
  resultText: string,
  wordCount: number
) {
  const supabase = await createServiceClient()

  await supabase.from('translations').insert({
    user_id: userId,
    mode,
    source_text: sourceText,
    result_text: resultText,
    word_count: wordCount,
  })
}
