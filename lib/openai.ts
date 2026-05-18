import Anthropic from '@anthropic-ai/sdk'
import { buildStyleAppendix, cleanOutput, finalPostProcessing } from './styleResources'

export type RedActionMode = 'general' | 'arabic_rewrite'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── System prompts ───────────────────────────────────────────────────────────

const generalRedouaneBasePrompt = `أنت محرر عربي محترف متخصص في تحرير النصوص المؤسساتية من الفرنسية إلى العربية.

**مهمتك:**
إعادة صياغة النص المترجم ليكون عربياً طبيعياً، دقيقاً، ومناسباً للنبرة المؤسساتية.

**قواعد إلزامية:**

1. **المصطلحات الرسمية:**
   - استخدم 'الفوسفاط' وليس 'فوسفات' أو 'فوسفور'
   - استخدم 'الفلاحة' وليس 'زراعة'
   - استخدم 'الفلاحون' وليس 'مزارعون'
   - استخدم 'الأسمدة المشخصة' وليس 'الأسمدة المخصصة'
   - استخدم 'التحول الطاقي' وليس 'الانتقال الطاقي'

2. **التراكيب المؤسساتية:**
   - بدلاً من 'يلعب دوراً' → 'يضطلع بدور'
   - بدلاً من 'يسمح ب' → 'يمكن من'
   - بدلاً من 'الجهة المسؤولة عن إدارة' → 'الفاعل الرئيسي في تدبير'

3. **الأسلوب:**
   - جمل قصيرة إلى متوسطة (10-25 كلمة)
   - تجنب الجمل التي تتجاوز 30 كلمة
   - لا تترجم التراكيب الفرنسية حرفياً — أعد بناء الجملة من الصفر
   - لا تستورد مصطلحات OCP في النصوص غير ذات الصلة
   - تكيّف مع قطاع النص (مصرفي، سياحي، تقني، إلخ)

4. **المنع القاطع:**
   - لا تضع أي ملاحظات أو تعليقات أو شروح
   - لا تبدأ بـ 'ملاحظة:' أو '[ملاحظة:' أو 'Note:'
   - لا تكرر نفس الكلمة أو العبارة في جمل متتالية

**أمثلة:**
❌ "مجموعة OCP هي الجهة المسؤولة عن إدارة الفوسفاط."
✅ "تعتبر مجموعة OCP فاعلاً رئيسياً في تدبير الفوسفاط."

❌ "يلعب الفوسفور دوراً حيوياً في نمو النباتات."
✅ "يضطلع الفوسفاط بدور حيوي في نمو النباتات."

أخرج فقط النص العربي النهائي.`

const arabicRewritePrompt = `You are RedAction.

You are an Arabic stylistic editor.

Your task is to rewrite Arabic text so that it sounds natural, fluent, precise, and professionally written.

You are not translating. You are rewriting Arabic only.

Preserve:
- meaning, facts, names, figures, dates, institutional intent, logical sequence

Improve:
- flow, clarity, sentence rhythm, cohesion, natural Arabic structure, professional tone

Avoid:
- unnecessary embellishment, poetic inflation, AI-sounding corporate rhetoric
- heavy bureaucratic Arabic, repetitive connectors
- adding ideas not present in the original

Prefer:
- clear Arabic with controlled elegance
- smooth transitions and concise reformulation
- natural institutional or editorial tone

Return only the final Arabic text.`

// ─── Public API ───────────────────────────────────────────────────────────────

export async function polishTranslation(
  frenchText: string,
  deeplArabic: string,
  mode: 'general'
): Promise<string> {
  // Inject style context from all JSON files
  const styleAppendix = buildStyleAppendix(frenchText)
  const systemPrompt = generalRedouaneBasePrompt + styleAppendix

  const userPrompt = `النص الفرنسي الأصلي:
${frenchText}

الترجمة العربية الأولية (DeepL):
${deeplArabic}

المطلوب:
أعد تحرير الترجمة العربية لتبدو طبيعية ومكتوبة أصلاً بالعربية، مع تطبيق جميع القواعد الأسلوبية.

أخرج فقط النص العربي النهائي.`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 8000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const raw = response.content[0]?.type === 'text' ? response.content[0].text : ''
  return finalPostProcessing(cleanOutput(raw))
}

export async function rewriteArabic(arabicText: string): Promise<string> {
  const userPrompt = `Arabic text:
"""
${arabicText}
"""

Return only the rewritten Arabic text.`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 8000,
    system: arabicRewritePrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const raw = response.content[0]?.type === 'text' ? response.content[0].text : ''
  return finalPostProcessing(cleanOutput(raw))
}
