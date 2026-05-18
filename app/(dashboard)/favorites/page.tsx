'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Star, Trash2, Copy, Check, X, Clock } from 'lucide-react'

const modeLabels: Record<string, string> = {
  general: 'Style Redouane',
  arabic_rewrite: 'Réécriture AR',
  ocp: 'OCP',
}

type Translation = {
  id: string
  mode: string
  source_text: string
  result_text: string
  word_count: number
  created_at: string
  is_favorite: boolean
  folder_id: string | null
}

export default function FavoritesPage() {
  const supabase = createClient()
  const [translations, setTranslations] = useState<Translation[]>([])
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState<Translation | null>(null)
  const [copiedSource, setCopiedSource] = useState(false)
  const [copiedResult, setCopiedResult] = useState(false)

  const loadFavorites = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from('translations')
      .select('id, mode, source_text, result_text, word_count, created_at, is_favorite, folder_id')
      .eq('user_id', user.id)
      .eq('is_favorite', true)
      .order('created_at', { ascending: false })

    setTranslations((data as Translation[]) ?? [])
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadFavorites()
  }, [loadFavorites])

  const unfavorite = async (t: Translation) => {
    setTranslations(prev => prev.filter(x => x.id !== t.id))
    await fetch(`/api/translations/${t.id}/favorite`, { method: 'POST' })
    if (openModal?.id === t.id) setOpenModal(null)
  }

  const deleteTranslation = async (id: string) => {
    setTranslations(prev => prev.filter(x => x.id !== id))
    await supabase.from('translations').delete().eq('id', id)
    if (openModal?.id === id) setOpenModal(null)
  }

  const copyText = async (text: string, which: 'source' | 'result') => {
    await navigator.clipboard.writeText(text)
    if (which === 'source') {
      setCopiedSource(true)
      setTimeout(() => setCopiedSource(false), 1500)
    } else {
      setCopiedResult(true)
      setTimeout(() => setCopiedResult(false), 1500)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Star size={20} className="text-yellow-400 fill-yellow-400" />
        <h1 className="text-xl font-bold text-gray-800">Favoris</h1>
        <span className="text-sm text-gray-400">{translations.length} traductions</span>
      </div>

      {!loading && translations.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <Star size={40} className="mx-auto mb-4 opacity-30" />
          <p>Aucun favori pour le moment.</p>
          <p className="text-xs mt-1">Ajoutez des traductions à vos favoris depuis l&apos;historique.</p>
        </div>
      )}

      <div className="space-y-4">
        {translations.map(t => (
          <div
            key={t.id}
            className="border border-gray-100 rounded-2xl p-5 bg-white shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600">
                  {modeLabels[t.mode] ?? t.mode}
                </span>
                <span className="text-xs text-gray-400">{t.word_count} mots</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400 mr-1">
                  {new Date(t.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </span>
                <button
                  onClick={() => unfavorite(t)}
                  className="p-1.5 rounded-lg transition hover:bg-yellow-50"
                  title="Retirer des favoris"
                >
                  <Star size={15} className="fill-yellow-400 text-yellow-400" />
                </button>
                <button
                  onClick={() => deleteTranslation(t.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div
              className="grid grid-cols-2 gap-4 cursor-pointer"
              onClick={() => setOpenModal(t)}
            >
              <div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Source</p>
                <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">{t.source_text}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1 text-right">Résultat</p>
                <p className="text-sm text-gray-700 line-clamp-3 leading-relaxed text-right" dir="rtl">{t.result_text}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {openModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setOpenModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600">
                  {modeLabels[openModal.mode] ?? openModal.mode}
                </span>
                <span className="text-xs text-gray-400">{openModal.word_count} mots</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {new Date(openModal.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'long', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
                <button
                  onClick={() => setOpenModal(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Texte source</p>
                  <button
                    onClick={() => copyText(openModal.source_text, 'source')}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition"
                  >
                    {copiedSource ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                    {copiedSource ? 'Copié' : 'Copier'}
                  </button>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{openModal.source_text}</p>
              </div>

              <div className="border-t border-gray-100" />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Résultat</p>
                  <button
                    onClick={() => copyText(openModal.result_text, 'result')}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition"
                  >
                    {copiedResult ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                    {copiedResult ? 'Copié' : 'Copier'}
                  </button>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap text-right" dir="rtl">
                  {openModal.result_text}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
