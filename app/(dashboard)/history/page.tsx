'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Clock, Star, Trash2, FolderOpen, Search, X, Copy, Check, ChevronDown,
} from 'lucide-react'

const modeLabels: Record<string, string> = {
  general: 'Style Redouane',
  arabic_rewrite: 'Réécriture AR',
  ocp: 'OCP',
}

type Folder = {
  id: string
  name: string
  color: string
  translation_count: number
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

type Filter = 'all' | 'favorites' | string // string = folder id

export default function HistoryPage() {
  const supabase = createClient()
  const [translations, setTranslations] = useState<Translation[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState<Translation | null>(null)
  const [copiedSource, setCopiedSource] = useState(false)
  const [copiedResult, setCopiedResult] = useState(false)
  const [openFolderDropdown, setOpenFolderDropdown] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [{ data: trans }, foldersRes] = await Promise.all([
      supabase
        .from('translations')
        .select('id, mode, source_text, result_text, word_count, created_at, is_favorite, folder_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100),
      fetch('/api/folders'),
    ])

    setTranslations((trans as Translation[]) ?? [])

    if (foldersRes.ok) {
      const json = await foldersRes.json()
      setFolders(json.folders ?? [])
    }
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadData()
  }, [loadData])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick() { setOpenFolderDropdown(null) }
    if (openFolderDropdown) {
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [openFolderDropdown])

  const toggleFavorite = async (t: Translation) => {
    // Optimistic update
    setTranslations(prev =>
      prev.map(x => x.id === t.id ? { ...x, is_favorite: !x.is_favorite } : x)
    )
    await fetch(`/api/translations/${t.id}/favorite`, { method: 'POST' })
  }

  const assignFolder = async (translationId: string, folderId: string | null) => {
    setTranslations(prev =>
      prev.map(x => x.id === translationId ? { ...x, folder_id: folderId } : x)
    )
    await fetch(`/api/translations/${translationId}/folder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_id: folderId }),
    })
    setOpenFolderDropdown(null)
    // Refresh folder counts
    const res = await fetch('/api/folders')
    if (res.ok) {
      const json = await res.json()
      setFolders(json.folders ?? [])
    }
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

  const filtered = translations.filter(t => {
    if (filter === 'favorites' && !t.is_favorite) return false
    if (filter !== 'all' && filter !== 'favorites' && t.folder_id !== filter) return false
    if (search && !t.source_text.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const getFolderName = (folderId: string | null) =>
    folders.find(f => f.id === folderId)?.name ?? null

  const getFolderColor = (folderId: string | null) =>
    folders.find(f => f.id === folderId)?.color ?? null

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Clock size={20} className="text-red-500" />
        <h1 className="text-xl font-bold text-gray-800">Historique</h1>
        <span className="text-sm text-gray-400">{filtered.length} traductions</span>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {(['all', 'favorites'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filter === f
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'Tout' : 'Favoris'}
          </button>
        ))}
        {folders.map(folder => (
          <button
            key={folder.id}
            onClick={() => setFilter(folder.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filter === folder.id
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: filter === folder.id ? '#fff' : folder.color }}
            />
            {folder.name}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher dans le texte source…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-200 bg-white"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <Clock size={40} className="mx-auto mb-4 opacity-30" />
          <p>Aucune traduction trouvée.</p>
        </div>
      )}

      {/* Cards */}
      <div className="space-y-4">
        {filtered.map(t => {
          const folderName = getFolderName(t.folder_id)
          const folderColor = getFolderColor(t.folder_id)

          return (
            <div
              key={t.id}
              className="border border-gray-100 rounded-2xl p-5 bg-white shadow-sm hover:shadow-md transition group"
            >
              {/* Top row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600">
                    {modeLabels[t.mode] ?? t.mode}
                  </span>
                  <span className="text-xs text-gray-400">{t.word_count} mots</span>
                  {folderName && (
                    <span
                      className="text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5"
                      style={{ backgroundColor: folderColor + '22', color: folderColor ?? '#888' }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: folderColor ?? '#888' }} />
                      {folderName}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400 mr-1">
                    {new Date(t.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </span>

                  {/* Star */}
                  <button
                    onClick={() => toggleFavorite(t)}
                    className="p-1.5 rounded-lg transition hover:bg-yellow-50"
                    title={t.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  >
                    <Star
                      size={15}
                      className={t.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}
                    />
                  </button>

                  {/* Folder dropdown */}
                  <div className="relative">
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setOpenFolderDropdown(prev => prev === t.id ? null : t.id)
                      }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition flex items-center gap-0.5"
                      title="Déplacer vers un dossier"
                    >
                      <FolderOpen size={14} />
                      <ChevronDown size={10} />
                    </button>

                    {openFolderDropdown === t.id && (
                      <div
                        className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-100 rounded-xl shadow-lg z-20 py-1"
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={() => assignFolder(t.id, null)}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition ${
                            !t.folder_id ? 'text-gray-900 font-semibold' : 'text-gray-500'
                          }`}
                        >
                          Aucun dossier
                        </button>
                        {folders.map(f => (
                          <button
                            key={f.id}
                            onClick={() => assignFolder(t.id, f.id)}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition flex items-center gap-2 ${
                              t.folder_id === f.id ? 'font-semibold text-gray-900' : 'text-gray-600'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: f.color }} />
                            {f.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => deleteTranslation(t.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Text preview — click to open modal */}
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
          )
        })}
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
            {/* Modal header */}
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

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Source */}
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

              {/* Result */}
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
