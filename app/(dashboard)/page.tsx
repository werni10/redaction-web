'use client'

import { useState, useEffect, useCallback } from 'react'
import ModePicker, { type Mode } from '@/components/editor/ModePicker'
import EditorPanel from '@/components/editor/EditorPanel'
import StatusBar from '@/components/editor/StatusBar'
import { Sparkles, Trash2, Upload } from 'lucide-react'
import { detectLanguage } from '@/lib/detectLanguage'

export default function EditorPage() {
  const [mode, setMode] = useState<Mode>('general')
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(true)
  const [sourceText, setSourceText] = useState('')
  const [resultText, setResultText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [wordCount, setWordCount] = useState<number>()
  const [requestCount, setRequestCount] = useState<number>()

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/usage')
      if (res.ok) {
        const data = await res.json()
        setWordCount(data.wordCount)
        setRequestCount(data.requestCount)
      }
    } catch {}
  }, [])

  useEffect(() => { fetchUsage() }, [fetchUsage])

  function handleSourceTextChange(text: string) {
    setSourceText(text)

    // Auto-detect and switch mode if enabled
    if (autoDetectEnabled && text.trim()) {
      const detectedLang = detectLanguage(text)
      if (detectedLang === 'ar') {
        setMode('arabic_rewrite')
      } else if (detectedLang === 'fr') {
        setMode('general')
      }
    }
  }

  async function handleRun() {
    if (!sourceText.trim() || isLoading) return

    setIsLoading(true)
    setResultText('')
    setStatusMessage('RedAction prépare le texte...')

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
          body: JSON.stringify({ frenchText: sourceText, mode }),
        })
      }

      const data = await res.json()

      if (!res.ok) {
        setStatusMessage(data.error || 'Une erreur est survenue.')
      } else {
        setResultText(data.result)
        setStatusMessage('Texte prêt.')
        await fetchUsage()
      }
    } catch {
      setStatusMessage('Erreur réseau. Réessayez.')
    } finally {
      setIsLoading(false)
    }
  }

  function clearAll() {
    setSourceText('')
    setResultText('')
    setStatusMessage('')
  }

  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = ev => {
      setSourceText((ev.target?.result as string) ?? '')
      setStatusMessage('Fichier importé.')
    }
    reader.readAsText(file, 'utf-8')
    e.target.value = ''
  }

  const buttonLabel = () => {
    if (isLoading) return 'Traitement...'
    if (mode === 'arabic_rewrite') return 'Réécrire avec RedAction'
    return 'Traduire avec RedAction'
  }

  const sourceTitle = mode === 'arabic_rewrite' ? 'Texte arabe à réécrire' : 'Texte français'
  const resultTitle = mode === 'arabic_rewrite' ? 'Texte arabe réécrit' : 'Texte arabe traduit'

  return (
    <div className="max-w-4xl mx-auto px-8 py-10 space-y-6">
      {/* Mode picker */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-sm font-semibold text-gray-600">Mode</span>
        <ModePicker value={mode} onChange={m => { setMode(m); setResultText(''); setStatusMessage('') }} />
      </div>

      {/* Source */}
      <EditorPanel
        title={sourceTitle}
        value={sourceText}
        onChange={handleSourceTextChange}
        placeholder="Entrez votre texte ici..."
        variant="source"
        maxLength={5000}
      />

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={clearAll}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
        >
          <Trash2 size={15} />
          Effacer
        </button>

        <button
          onClick={handleRun}
          disabled={isLoading || !sourceText.trim()}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles size={15} />
          {buttonLabel()}
        </button>

        <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer">
          <Upload size={15} />
          Importer un fichier
          <input
            type="file"
            accept=".txt"
            onChange={handleFileImport}
            className="hidden"
          />
        </label>
      </div>

      {/* Result */}
      <EditorPanel
        title={resultTitle}
        value={resultText}
        placeholder="Le texte apparaîtra ici..."
        readOnly
        variant="result"
      />

      {/* Status */}
      <StatusBar
        message={statusMessage}
        wordCount={wordCount}
        requestCount={requestCount}
      />
    </div>
  )
}
