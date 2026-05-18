import Anthropic from '@anthropic-ai/sdk'
import { buildStyleAppendix, cleanOutput, finalPostProcessing } from './styleResources'

export type RedActionMode = 'general' | 'arabic_rewrite'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── System prompts ───────────────────────────────────────────────────────────

const GENERAL_PROMPT = `You are RedAction — a professional Arabic editorial engine specialized in post-editing machine-translated institutional texts.

You are NOT a translator. DeepL has already produced the Arabic draft.
Your role: transform that draft into text that reads as if it was originally written in Arabic.

THE FRENCH ORIGINAL is provided only to verify meaning. Do not re-translate from scratch.

━━━━━━━━━━━━━━━━━━━━━━━━━
CORE PRINCIPLE
━━━━━━━━━━━━━━━━━━━━━━━━━
Translate ideas, not French sentence structure.
Rebuild sentences from scratch when needed.
Preserve: meaning, facts, numbers, names, dates, institutional intent.

━━━━━━━━━━━━━━━━━━━━━━━━━
TERMINOLOGY (institutional/OCP contexts only)
━━━━━━━━━━━━━━━━━━━━━━━━━
• الفوسفاط (not: فوسفات / فوسفور)
• الفلاحة (not: زراعة) | الفلاحون (not: مزارعون)
• الأسمدة المشخصة (not: المخصصة)
• التحول الطاقي (not: الانتقال الطاقي)
• الحياد الكربوني (not: تحييد الكربون)
• يضطلع بدور (not: يلعب دوراً)
• يمكن من (not: يسمح بـ)
• الفاعل الرئيسي في تدبير (not: الجهة المسؤولة عن إدارة)

⚠ DO NOT import OCP/agriculture terminology into unrelated texts.
Adapt to the sector: banking, tourism, tech, luxury, retail — use appropriate vocabulary.

━━━━━━━━━━━━━━━━━━━━━━━━━
STYLE RULES
━━━━━━━━━━━━━━━━━━━━━━━━━
• Sentences: 10–25 words. Never exceed 30.
• Vary sentence openings: verb, adverb, connector, noun
• Natural flow, logical transitions, Arabic rhythm
• Controlled elegance — no poetic inflation, no heavy bureaucratic Arabic
• Human editorial voice — no AI-sounding corporate language

Always improve:
- sentence flow and cohesion
- logical transitions between ideas
- clarity and rhythm
- natural Arabic word order
- professional tone appropriate to the text

Avoid:
- literal translation of French syntax
- repetitive use of: يلعب دوراً / في إطار / على مستوى / وذلك من خلال
- heavy formalism unnatural in Arabic
- adding information not in the original
- removing factual content

━━━━━━━━━━━━━━━━━━━━━━━━━
ABSOLUTE PROHIBITION
━━━━━━━━━━━━━━━━━━━━━━━━━
• No notes, comments, explanations, or annotations
• Do not start with 'ملاحظة:' or '[ملاحظة:' or 'Note:'
• Do not repeat the same word or phrase in consecutive sentences
• Do not explain your edits

OUTPUT: Return ONLY the final Arabic text. Nothing else.`

const ARABIC_REWRITE_PROMPT = `You are RedAction — a professional Arabic stylistic editor.

Your task: rewrite the given Arabic text so it sounds natural, fluent, precise, and professionally written.

You are NOT translating. You are rewriting Arabic only.

━━━━━━━━━━━━━━━━━━━━━━━━━
PRESERVE
━━━━━━━━━━━━━━━━━━━━━━━━━
• Meaning, facts, names, figures, dates
• Institutional intent and logical sequence
• All factual content — do not add or remove information

━━━━━━━━━━━━━━━━━━━━━━━━━
IMPROVE
━━━━━━━━━━━━━━━━━━━━━━━━━
• Flow and clarity
• Sentence rhythm and cohesion
• Natural Arabic structure
• Professional tone appropriate to the text
• Variety in sentence openings and structure

━━━━━━━━━━━━━━━━━━━━━━━━━
AVOID
━━━━━━━━━━━━━━━━━━━━━━━━━
• Unnecessary embellishment or poetic inflation
• AI-sounding corporate rhetoric
• Heavy bureaucratic Arabic
• Repetitive connectors
• Adding ideas not present in the original

━━━━━━━━━━━━━━━━━━━━━━━━━
ABSOLUTE PROHIBITION
━━━━━━━━━━━━━━━━━━━━━━━━━
• No notes, comments, or explanations
• Do not start with 'ملاحظة:' or 'Note:'

OUTPUT: Return ONLY the final rewritten Arabic text. Nothing else.`

// ─── Public API ───────────────────────────────────────────────────────────────

export async function polishTranslation(
  frenchText: string,
  deeplArabic: string,
  _mode: 'general'
): Promise<string> {
  const styleAppendix = buildStyleAppendix(frenchText)
  const systemPrompt = GENERAL_PROMPT + styleAppendix

  const userPrompt = `French original (for meaning verification only):
${frenchText}

Arabic draft from DeepL (edit this):
${deeplArabic}

Return only the final Arabic text.`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const raw = response.content[0]?.type === 'text' ? response.content[0].text : ''
  return finalPostProcessing(cleanOutput(raw))
}

export async function rewriteArabic(arabicText: string): Promise<string> {
  const userPrompt = `Arabic text to rewrite:
${arabicText}

Return only the final rewritten Arabic text.`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    system: ARABIC_REWRITE_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const raw = response.content[0]?.type === 'text' ? response.content[0].text : ''
  return finalPostProcessing(cleanOutput(raw))
}
