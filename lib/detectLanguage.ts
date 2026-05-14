export function detectLanguage(text: string): 'ar' | 'fr' | null {
  if (!text.trim()) return null

  // Arabic Unicode ranges
  const arabicRange = /[؀-ۿ]/g
  // French/Latin characters (accounting for accents)
  const latinRange = /[a-zA-ZÀ-ÿ]/g

  const arabicMatches = text.match(arabicRange) || []
  const latinMatches = text.match(latinRange) || []

  const arabicRatio = arabicMatches.length / text.length
  const latinRatio = latinMatches.length / text.length

  // If Arabic characters make up >20% of text, treat as Arabic
  if (arabicRatio > 0.2) return 'ar'
  // If Latin characters make up >30% of text, treat as French
  if (latinRatio > 0.3) return 'fr'

  // Default: if more Arabic than Latin
  return arabicMatches.length > latinMatches.length ? 'ar' : 'fr'
}
