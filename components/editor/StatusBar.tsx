'use client'

import { Info } from 'lucide-react'

interface Props {
  message?: string
  wordCount?: number
  requestCount?: number
}

export default function StatusBar({ message, wordCount, requestCount }: Props) {
  const defaultMsg = 'RedAction utilise l\'IA pour fournir des traductions précises et un style naturel.'

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl text-sm text-gray-500 border border-gray-100">
      <Info size={16} className="text-blue-400 shrink-0" />
      <span className="flex-1">{message || defaultMsg}</span>
      {(wordCount !== undefined || requestCount !== undefined) && (
        <span className="text-xs text-gray-400 shrink-0">
          {wordCount ?? 0} mots · {requestCount ?? 0} requêtes ce mois
        </span>
      )}
    </div>
  )
}
