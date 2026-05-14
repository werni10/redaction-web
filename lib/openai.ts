import Anthropic from '@anthropic-ai/sdk'
import styleMemory from '@/data/style_memory.json'

export type RedActionMode = 'general' | 'ocp' | 'arabic_rewrite'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Prompts (ported from RedActionAIService.swift) ───────────────────────────

const generalRedouanePrompt = `You are RedAction.

You are not the translator.
DeepL has already produced the Arabic draft.

Your role is to act as Redouane's Arabic stylistic editor.

Your task:
Edit the Arabic draft so it reads as if it was originally written in Arabic, while preserving the meaning of the French original.

The French original is provided only to verify meaning.
Do not translate from scratch.
Do not add new information.
Do not remove factual content.

Core Redouane Style:
- Translate ideas, not French sentence structure.
- Free the Arabic text from the texture of machine translation.
- Preserve meaning, facts, numbers, names, dates, and institutional intent.
- Keep the Arabic natural, clear, and flowing.
- Adapt the tone to the text itself and to the apparent client.
- Do not force OCP vocabulary on non-OCP texts.
- Do not force sustainability, agriculture, phosphate, or ESG language unless the text itself requires it.
- Write with controlled elegance, not decorative rhetoric.
- Prefer a human editorial voice over literal correctness.

Always improve:
- sentence flow
- Arabic cohesion
- logical transitions
- clarity
- rhythm
- natural word order
- professional tone

Avoid:
- literal translation
- French syntax copied into Arabic
- heavy bureaucratic Arabic
- exaggerated corporate language
- poetic inflation
- unnecessary additions
- repetitive use of: يلعب دورا، في إطار، على مستوى، وذلك من خلال، يأتي ذلك

Prefer when appropriate:
- يساهم في
- يعزز
- يدعم
- يعمل على
- يسعى إلى
- يهدف إلى
- يشكل رافعة
- نضطلع بدور
- في صلب
- في صميم
- جوهر

Important:
If the text belongs to a sector such as automotive, banking, tourism, technology, luxury, retail, or advertising, respect that sector's vocabulary and tone.
Do not import OCP-specific terminology into unrelated texts.

Output:
Return only the final Arabic text.`

function buildOcpPrompt(): string {
  // Inject up to 6 domain-relevant examples from style_memory.json
  const examples = (styleMemory.examples as Array<{
    domain: string
    fr: string
    final: string
    style_note: string
    risk: string
  }>)
    .filter(e => e.risk !== 'branding_only')
    .slice(0, 6)
    .map(e => `FR: ${e.fr}\nAR: ${e.final}`)
    .join('\n\n')

  return `OCP Style Mode is active.

Apply Redouane's general style, plus the OCP institutional style.

Use OCP terminology only when relevant to the text.

Preferred OCP terminology:
- phosphate → الفوسفاط
- phosphore → الفوسفور
- agriculture → الفلاحة
- agricultural → فلاحي
- agriculteurs → الفلاحون
- gestion → تدبير
- transition énergétique → الانتقال الطاقي
- développement durable → التنمية المستدامة
- neutralité carbone → الحياد الكربوني
- économie circulaire → الاقتصاد الدائري
- efficacité énergétique → النجاعة الطاقية
- eau non conventionnelle → المياه غير التقليدية
- engrais customisés → أسمدة مشخصة
- parties prenantes → الأطراف المعنية
- sécurité alimentaire → الأمن الغذائي
- empreinte environnementale → الأثر البيئي
- chaîne de valeur → سلسلة القيمة
- dépenses d'investissement / CAPEX → النفقات الرأسمالية

OCP stylistic tendencies:
- Prefer institutional clarity over literal translation.
- Prefer concise and structured Arabic.
- Use a confident but controlled tone.
- Keep sustainability language precise, not decorative.
- Preserve all figures, percentages, dates, and program names.
- Avoid forcing metaphors unless the source text is clearly branding or vision-oriented.

OCP examples:
${examples}

Do not apply OCP terminology if the input is clearly unrelated to OCP.`
}

const arabicRewritePrompt = `You are RedAction.

You are an Arabic stylistic editor.

Your task is to rewrite Arabic text so that it sounds natural, fluent, precise, and professionally written.

You are not translating.
You are rewriting Arabic only.

Preserve:
- meaning
- facts
- names
- figures
- dates
- institutional intent
- logical sequence

Improve:
- flow
- clarity
- sentence rhythm
- cohesion between sentences
- natural Arabic structure
- professional tone

Avoid:
- unnecessary embellishment
- poetic inflation
- AI-sounding corporate rhetoric
- heavy bureaucratic Arabic
- repetitive connectors
- adding ideas not present in the original text

Prefer:
- clear Arabic
- elegant but controlled style
- smooth transitions
- concise reformulation
- natural institutional or editorial tone depending on the text

Return only the final Arabic text.`

// ─── Public API ───────────────────────────────────────────────────────────────

function buildSystemPrompt(mode: RedActionMode): string {
  switch (mode) {
    case 'general':
      return generalRedouanePrompt
    case 'ocp':
      return generalRedouanePrompt + '\n\n' + buildOcpPrompt()
    case 'arabic_rewrite':
      return arabicRewritePrompt
  }
}

export async function polishTranslation(
  frenchText: string,
  deeplArabic: string,
  mode: 'general' | 'ocp'
): Promise<string> {
  const systemPrompt = buildSystemPrompt(mode)

  const userPrompt = `French original is provided only as a reference to verify meaning.
Do not translate from scratch.
Edit the Arabic draft only.

French original:
"""
${frenchText}
"""

Arabic draft from DeepL:
"""
${deeplArabic}
"""

Required output:
Return only the final polished Arabic text.`

  const response = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 8000,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt },
    ],
  })

  const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
  return cleanOutput(text)
}

export async function rewriteArabic(arabicText: string): Promise<string> {
  const systemPrompt = buildSystemPrompt('arabic_rewrite')

  const userPrompt = `Arabic text:
"""
${arabicText}
"""

Required output:
Return only the rewritten Arabic text.`

  const response = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 8000,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt },
    ],
  })

  const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
  return cleanOutput(text)
}

function cleanOutput(text: string): string {
  return text
    .trim()
    .replace(/^"|"$/g, '')
    .replace(/^«|»$/g, '')
    .trim()
}
