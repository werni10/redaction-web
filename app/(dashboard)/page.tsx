'use client'

import { useState, useEffect, useCallback } from 'react'
import ModePicker, { type Mode } from '@/components/editor/ModePicker'
import { Sparkles, Trash2, Upload, Copy, Check, Languages, RefreshCw } from 'lucide-react'
import { detectLanguage } from '@/lib/detectLanguage'

export default function EditorPage() {
  const [mode, setMode] = useState<Mode>('general')
  const [sourceText, setSourceText] = useState('')
  const [resultText, setResultText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState<'idle' | 'success' | 'error'>('idle')
  const [wordCount, setWordCount] = useState<number>(0)
  const [copied, setCopied] = useState(false)

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/usage')
      if (res.ok) {
        const data = await res.json()
        setWordCount(data.wordCount ?? 0)
      }
    } catch {}
  }, [])

  useEffect(() => { fetchUsage() }, [fetchUsage])

  function handleSourceTextChange(text: string) {
    setSourceText(text)
    if (text.trim()) {
      const lang = detectLanguage(text)
      if (lang === 'ar') setMode('arabic_rewrite')
      else if (lang === 'fr') setMode('general')
    }
  }

  async function handleRun() {
    if (!sourceText.trim() || isLoading) return
    setIsLoading(true)
    setResultText('')
    setStatusMessage('RedAction traite le texte…')
    setStatusType('idle')

    try {
      let res: Response
      if (mode === 'arabic_rewrite') {
        res = await fetch('/api/rewrite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ arabicText: sourceText }),
        })
      } else {
        res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frenchText: sourceText }),
        })
      }

      const data = await res.json()
      if (!res.ok) {
        setStatusMessage(data.error || 'Une erreur est survenue.')
        setStatusType('error')
      } else {
        setResultText(data.result)
        setStatusMessage(`Terminé — ${data.wordCount ?? 0} mots traités.`)
        setStatusType('success')
        await fetchUsage()
      }
    } catch {
      setStatusMessage('Erreur réseau. Réessayez.')
      setStatusType('error')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCopy() {
    if (!resultText) return
    await navigator.clipboard.writeText(resultText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function clearAll() {
    setSourceText('')
    setResultText('')
    setStatusMessage('')
    setStatusType('idle')
  }

  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = (ev.target?.result as string) ?? ''
      setSourceText(text)
      setStatusMessage('Fichier importé.')
    }
    reader.readAsText(file, 'utf-8')
    e.target.value = ''
  }

  const isArabicMode = mode === 'arabic_rewrite'
  const charCount = sourceText.length
  const charLimit = 5000

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-900">
            {isArabicMode ? 'Réécriture arabe' : 'Traduction FR → AR'}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {isArabicMode
              ? 'Réécriture naturelle et professionnelle'
              : 'DeepL + style éditorial Redouane'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ModePicker
            value={mode}
            onChange={m => { setMode(m); setResultText(''); setStatusMessage('') }}
          />
        </div>
      </header>

      {/* Editor area */}
      <div className="flex-1 flex gap-0 overflow-hidden">
        {/* Source */}
        <div className="flex-1 flex flex-col border-r border-gray-200 bg-white">
          <div className="px-6 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-sm font-semibold text-gray-700">
                {isArabicMode ? 'Texte arabe' : 'Texte français'}
              </span>
            </div>
            <span className={`text-xs font-medium ${charCount > charLimit * 0.9 ? 'text-red-500' : 'text-gray-400'}`}>
              {charCount.toLocaleString()} / {charLimit.toLocaleString()}
            </span>
          </div>

          <textarea
            value={sourceText}
            onChange={e => handleSourceTextChange(e.target.value)}
            maxLength={charLimit}
            placeholder={isArabicMode
              ? 'أدخل النص العربي هنا للمراجعة والإعادة الصياغة…'
              : 'Entrez votre texte français ici…'}
            dir={isArabicMode ? 'rtl' : 'ltr'}
            className={`flex-1 w-full resize-none px-6 py-5 text-[15px] leading-relaxed text-gray-800 placeholder-gray-300 focus:outline-none bg-white ${isArabicMode ? 'font-arabic' : ''}`}
          />

          {/* Source actions */}
          <div className="px-6 py-3 border-t border-gray-100 flex items-center gap-2 bg-white">
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-50 transition"
            >
              <Trash2 size={13} />
              Effacer
            </button>

            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-50 transition cursor-pointer">
              <Upload size={13} />
              Importer .txt
              <input type="file" accept=".txt" onChange={handleFileImport} className="hidden" />
            </label>

            <div className="flex-1" />

            <button
              onClick={handleRun}
              disabled={isLoading || !sourceText.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              {isLoading
                ? <><RefreshCw size={14} className="animate-spin" /> Traitement…</>
                : <><Sparkles size={14} /> {isArabicMode ? 'Réécrire' : 'Traduire'}</>}
            </button>
          </div>
        </div>

        {/* Result */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="px-6 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full transition-colors ${resultText ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-sm font-semibold text-gray-700">
                {isArabicMode ? 'Texte réécrit' : 'Texte arabe'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {statusType === 'success' && (
                <span className="text-xs text-green-600 font-medium">{statusMessage}</span>
              )}
              {statusType === 'error' && (
                <span className="text-xs text-red-500 font-medium">{statusMessage}</span>
              )}
              {statusType === 'idle' && statusMessage && (
                <span className="text-xs text-gray-400">{statusMessage}</span>
              )}
            </div>
          </div>

          <div className="flex-1 relative overflow-auto">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-3">
                  <div className="w-8 h-8 border-2 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-gray-400">RedAction travaille…</p>
                </div>
              </div>
            ) : resultText ? (
              <div
                dir="rtl"
                className="px-6 py-5 text-[15px] leading-relaxed text-gray-800 whitespace-pre-wrap font-arabic min-h-full"
              >
                {resultText}
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-2 px-8">
                  <Languages size={32} className="text-gray-200 mx-auto" />
                  <p className="text-sm text-gray-300">
                    Le texte traduit apparaîtra ici
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Result actions */}
          <div className="px-6 py-3 border-t border-gray-100 flex items-center gap-2 bg-white">
            <button
              onClick={handleCopy}
              disabled={!resultText}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-50 transition disabled:opacity-30"
            >
              {copied ? <><Check size={13} className="text-green-500" /> Copié</> : <><Copy size={13} /> Copier</>}
            </button>

            <div className="flex-1" />

            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-200" />
              {wordCount.toLocaleString()} mots ce mois
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
