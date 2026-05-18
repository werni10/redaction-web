import fs from 'fs'
import path from 'path'

// ─── In-memory cache — files read once per server lifetime ───────────────────
const jsonCache = new Map<string, unknown>()

function loadJSON<T>(filename: string): T | null {
  if (jsonCache.has(filename)) return jsonCache.get(filename) as T
  try {
    const filePath = path.join(process.cwd(), 'data', filename)
    const raw = fs.readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw) as T
    jsonCache.set(filename, parsed)
    return parsed
  } catch {
    return null
  }
}

// ─── Pre-built static appendix cache (built once, reused) ────────────────────
let staticAppendixCache: string | null = null

function getStaticAppendix(): string {
  if (staticAppendixCache !== null) return staticAppendixCache
  // Build everything except examples (examples are dynamic per source text)
  const editorial = loadJSON<Parameters<typeof formatEditorial>[0]>('redaction_editorial_profile.json')
  const styleSheet = loadJSON<Parameters<typeof formatStyleSheet>[0]>('style.json')
  const ocpGlossary = loadJSON<Parameters<typeof formatOCPGlossary>[0]>('ocp_glossary.json')
  const ocpTone = loadJSON<Parameters<typeof formatOCPTone>[0]>('ocp_tone.json')
  const ocpRewriteRules = loadJSON<Parameters<typeof formatOCPRewriteRules>[0]>('ocp_rewrite_rules.json')
  const ocpRhetoric = loadJSON<Parameters<typeof formatOCPRhetoric>[0]>('ocp_rhetoric.json')

  const sections: string[] = []
  if (editorial) sections.push(formatEditorial(editorial))
  if (styleSheet) sections.push(formatStyleSheet(styleSheet))
  if (ocpGlossary) sections.push(formatOCPGlossary(ocpGlossary))
  if (ocpTone) sections.push(formatOCPTone(ocpTone))
  if (ocpRewriteRules) sections.push(formatOCPRewriteRules(ocpRewriteRules))
  if (ocpRhetoric) sections.push(formatOCPRhetoric(ocpRhetoric))

  staticAppendixCache = sections.length
    ? '\n\n---\n## RedAction style data\n\n' + sections.join('\n\n---\n\n')
    : ''
  return staticAppendixCache
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditorialProfile {
  style_profile?: string
  core_identity?: { type?: string; goal?: string; writing_philosophy?: string }
  style_principles?: Record<string, boolean>
  preferred_verbs?: string[]
  verbs_to_limit?: string[]
  preferred_expressions?: string[]
  style_objective?: { target_effect?: string; priority_order?: string[] }
}

interface StyleSheet {
  expressions: { fr: string; ar: string }[]
  glossary: Record<string, string>
  rules: { type: string; from: string; to: string }[]
}

interface StyleMemory {
  description?: string
  style_identity?: {
    target_style?: string
    core_principle?: string
    avoid?: string[]
    prefer?: string[]
  }
  canonical_rules?: {
    id?: string
    name?: string
    rule?: string
    pattern?: string
    preferred?: string[]
    avoid?: string[]
    risk?: string
  }[]
  terminology_preferences?: {
    stable?: Record<string, string>
  }
  examples?: {
    id?: string
    domain?: string
    fr?: string
    deepl?: string
    final?: string
    style_note?: string
    risk?: string
  }[]
  prompt_usage_guidelines?: { max_examples_per_request?: number }
}

interface OCPGlossary {
  glossary: { french_term: string; preferred_arabic: string; domain: string }[]
}

interface OCPTone {
  institutional_tone_profile: {
    formality: string
    precision: string
    promotional_intensity: string
    sentence_rhythm: string
    preferred_sentence_length: string
    tone_description: string
  }
}

interface OCPRewriteRules {
  preferred_verb_patterns: { verb: string; function: string; recommended_translation_style: string }[]
  translation_risks: { risk: string; recommended_strategy: string }[]
  arabic_rewriting_guidelines: string[]
}

interface OCPRhetoric {
  rhetorical_patterns: { pattern: string; purpose: string; translation_guidance: string }[]
}

// ─── Builder ──────────────────────────────────────────────────────────────────

export function buildStyleAppendix(sourceText: string): string {
  // Static parts cached — only examples are dynamic per source text
  const base = getStaticAppendix()
  const styleMemory = loadJSON<StyleMemory>('style_memory.json')

  const sections: string[] = [base]

  if (styleMemory) sections.push(formatStyleMemory(styleMemory, sourceText))
  return sections.filter(Boolean).join('\n\n---\n\n')
}

function formatEditorial(p: EditorialProfile): string {
  const lines = ['### Editorial profile']
  if (p.style_profile) lines.push(`Profile: ${p.style_profile}`)
  if (p.core_identity) {
    if (p.core_identity.type) lines.push(`Identity: ${p.core_identity.type}`)
    if (p.core_identity.goal) lines.push(`Goal: ${p.core_identity.goal}`)
    if (p.core_identity.writing_philosophy) lines.push(`Philosophy: ${p.core_identity.writing_philosophy}`)
  }
  if (p.preferred_verbs?.length) lines.push('Preferred verbs: ' + p.preferred_verbs.join('، '))
  if (p.verbs_to_limit?.length) lines.push('Limit: ' + p.verbs_to_limit.join('، '))
  if (p.preferred_expressions?.length) lines.push('Preferred connectors: ' + p.preferred_expressions.join('، '))
  if (p.style_objective?.priority_order?.length)
    lines.push('Priority: ' + p.style_objective.priority_order.join(' → '))
  return lines.join('\n')
}

function formatStyleSheet(s: StyleSheet): string {
  const lines = ['### Style sheet']
  lines.push('FR→AR expressions:')
  s.expressions.slice(0, 28).forEach(pair => lines.push(`- «${pair.fr}» → «${pair.ar}»`))
  lines.push('Glossary:')
  Object.entries(s.glossary).slice(0, 16).forEach(([k, v]) => lines.push(`- ${k} → ${v}`))
  lines.push('Micro-rules:')
  s.rules.slice(0, 12).forEach(rule => lines.push(`- [${rule.type}] «${rule.from}» → «${rule.to}»`))
  return lines.join('\n')
}

function formatStyleMemory(m: StyleMemory, sourceText: string): string {
  const lines = ['### Style memory']
  if (m.description) lines.push(m.description)
  if (m.style_identity) {
    const { target_style, core_principle, avoid, prefer } = m.style_identity
    if (target_style) lines.push(`Target: ${target_style}`)
    if (core_principle) lines.push(`Core: ${core_principle}`)
    if (avoid?.length) lines.push('Avoid: ' + avoid.join('؛ '))
    if (prefer?.length) lines.push('Prefer: ' + prefer.join('؛ '))
  }
  if (m.canonical_rules?.length) {
    lines.push('Canonical rules:')
    m.canonical_rules.forEach(rule => {
      let row = rule.id ? `[${rule.id}] ` : ''
      row += rule.name ? `${rule.name}: ` : ''
      if (rule.rule) row += rule.rule
      else if (rule.pattern) {
        row += `pattern «${rule.pattern}»`
        if (rule.preferred?.length) row += ' → prefer: ' + rule.preferred.join(' | ')
        if (rule.avoid?.length) row += ' ; avoid: ' + rule.avoid.join(' | ')
      }
      if (rule.risk) row += ` (risk: ${rule.risk})`
      lines.push(`- ${row}`)
    })
  }
  if (m.terminology_preferences?.stable) {
    lines.push('Stable terminology:')
    Object.entries(m.terminology_preferences.stable).slice(0, 22).forEach(([k, v]) =>
      lines.push(`- ${k} → ${v}`)
    )
  }
  if (m.examples?.length) {
    const limit = m.prompt_usage_guidelines?.max_examples_per_request ?? 6
    const picked = pickExamples(m.examples, sourceText, Math.min(limit, 8))
    lines.push('Curated examples (FR → draft → final):')
    picked.forEach(ex => {
      if (!ex.fr || !ex.final) return
      let block = `- [${ex.domain ?? '?'}] ${ex.id ?? ''}`
      block += `\n  FR: ${ex.fr}`
      if (ex.deepl) block += `\n  Draft: ${ex.deepl}`
      block += `\n  Final: ${ex.final}`
      if (ex.style_note) block += `\n  Note: ${ex.style_note}`
      if (ex.risk) block += ` (risk: ${ex.risk})`
      lines.push(block)
    })
  }
  return lines.join('\n')
}

function pickExamples(
  examples: NonNullable<StyleMemory['examples']>,
  sourceText: string,
  limit: number
) {
  const sourceLower = sourceText.toLowerCase()
  const tokens = new Set(
    sourceLower.split(/\s+/).filter(t => t.length > 2)
  )
  const scored = examples.map((ex, idx) => {
    const fr = ex.fr?.toLowerCase() ?? ''
    const frTokens = fr.split(/\s+/).filter(t => t.length > 2)
    let score = frTokens.filter(t => tokens.has(t)).length
    if (ex.risk === 'critical') score += 2
    return { score: score * 10 + (examples.length - idx), ex }
  })
  scored.sort((a, b) => b.score - a.score)
  const seen = new Set<string>()
  const result: typeof examples = []
  for (const { ex } of scored) {
    const key = ex.id ?? ex.fr ?? ''
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(ex)
    if (result.length >= limit) break
  }
  return result
}

function formatOCPGlossary(g: OCPGlossary): string {
  const lines = ['### OCP Glossary']
  g.glossary.slice(0, 40).forEach(e =>
    lines.push(`- ${e.french_term} → ${e.preferred_arabic} [${e.domain}]`)
  )
  return lines.join('\n')
}

function formatOCPTone(t: OCPTone): string {
  const tone = t.institutional_tone_profile
  return [
    '### OCP Tone',
    `- Formality: ${tone.formality}`,
    `- Precision: ${tone.precision}`,
    `- Promotional intensity: ${tone.promotional_intensity}`,
    `- Sentence rhythm: ${tone.sentence_rhythm}`,
    `- Preferred length: ${tone.preferred_sentence_length}`,
    `- Description: ${tone.tone_description}`,
  ].join('\n')
}

function formatOCPRewriteRules(r: OCPRewriteRules): string {
  const lines = ['### OCP Rewrite rules']
  lines.push('Verb patterns:')
  r.preferred_verb_patterns.slice(0, 12).forEach(v =>
    lines.push(`- ${v.verb}: ${v.recommended_translation_style} (${v.function})`)
  )
  lines.push('Translation risks:')
  r.translation_risks.slice(0, 10).forEach(risk =>
    lines.push(`- ${risk.risk} → ${risk.recommended_strategy}`)
  )
  lines.push('Rewriting guidelines:')
  r.arabic_rewriting_guidelines.slice(0, 12).forEach(g => lines.push(`- ${g}`))
  return lines.join('\n')
}

function formatOCPRhetoric(r: OCPRhetoric): string {
  const lines = ['### OCP Rhetorical patterns']
  r.rhetorical_patterns.slice(0, 15).forEach(pat =>
    lines.push(`- Pattern: ${pat.pattern}\n  Purpose: ${pat.purpose}\n  Guidance: ${pat.translation_guidance}`)
  )
  return lines.join('\n')
}

// ─── Post-processing (ported from Swift cleanOutput + finalPostProcessing) ────

export function cleanOutput(text: string): string {
  let cleaned = text.trim().replace(/```/g, '')

  const forbiddenMarkers = [
    '<الترجمة المحسنة>', '<التعديلات الرئيسية>',
    'شرح التعديلات', 'ملاحظات', 'ملاحظة:',
    '[ملاحظة:', 'note:', '[Note:',
  ]
  for (const marker of forbiddenMarkers) {
    const idx = cleaned.indexOf(marker)
    if (idx !== -1) {
      cleaned = cleaned.slice(0, idx).trim()
      break
    }
  }

  cleaned = cleaned.replace(/\[?ملاحظة:?\]?[\s\S]*/, '').trim()
  cleaned = cleaned.replace(/\[?Note:?\]?[\s\S]*/, '').trim()
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

  return cleaned
}

export function finalPostProcessing(text: string): string {
  let processed = text

  // French comma → Arabic comma
  processed = processed.replace(/,/g, '،')

  // Break long paragraphs
  const paragraphs = processed.split('\n\n')
  const newParagraphs: string[] = []
  for (const para of paragraphs) {
    if (para.length > 400 && para.trim()) {
      const sentences = para.split('.')
      let chunk = ''
      for (const sentence of sentences) {
        const trimmed = sentence.trim()
        if (!trimmed) continue
        const candidate = chunk ? `${chunk} ${trimmed}.` : `${trimmed}.`
        if (candidate.length > 400 && chunk) {
          newParagraphs.push(chunk)
          chunk = `${trimmed}.`
        } else {
          chunk = candidate
        }
      }
      if (chunk) newParagraphs.push(chunk)
    } else {
      newParagraphs.push(para)
    }
  }
  processed = newParagraphs.join('\n\n')

  processed = processed.replace(/ +/g, ' ')
  processed = processed.replace(/\n{3,}/g, '\n\n')
  processed = processed.trim()

  return processed
}
