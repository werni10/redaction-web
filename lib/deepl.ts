export async function translateToArabic(text: string): Promise<string> {
  const apiKey = process.env.DEEPL_API_KEY
  if (!apiKey) throw new Error('DEEPL_API_KEY not set')

  const body = new URLSearchParams({
    auth_key: apiKey,
    text,
    target_lang: 'AR',
  })

  const res = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`DeepL error ${res.status}: ${detail}`)
  }

  const data = await res.json()
  const translated = data?.translations?.[0]?.text
  if (!translated) throw new Error('No translation returned from DeepL')

  return translated
}
