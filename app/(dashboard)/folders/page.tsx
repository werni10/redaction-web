'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  FolderOpen, Plus, Pencil, Trash2, Check, X, Star, Clock, Copy,
  ChevronLeft,
} from 'lucide-react'

const modeLabels: Record<string, string> = {
  general: 'Style Redouane',
  arabic_rewrite: 'Réécriture AR',
  ocp: 'OCP',
}

const FOLDER_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
]

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

export default function FoldersPage() {
  const supabase = createClient()
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null)
  const [folderTranslations, setFolderTranslations] = useState<Translation[]>([])
  const [loadingTrans, setLoadingTrans] = useState(false)

  // Create folder
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#ef4444')
  const [saving, setSaving] = useState(false)

  // Rename folder
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // Modal
  const [openModal, setOpenModal] = useState<Translation | null>(null)
  const [copiedSource, setCopiedSource] = useState(false)
  const [copiedResult, setCopiedResult] = useState(false)

  const loadFolders = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/folders')
    if (res.ok) {
      const json = await res.json()
      setFolders(json.folders ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadFolders()
  }, [loadFolders])

  const openFolder = async (folder: Folder) => {
    setSelectedFolder(folder)
    setLoadingTrans(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoadingTrans(false); return }

    const { data } = await supabase
      .from('translations')
      .select('id, mode, source_text, result_text, word_count, created_at, is_favorite, folder_id')
      .eq('user_id', user.id)
      .eq('folder_id', folder.id)
      .order('created_at', { ascending: false })

    setFolderTranslations((data as Translation[]) ?? [])
    setLoadingTrans(false)
  }

  const createFolder = async () => {
    if (!newName.trim()) return
    setSaving(true)
    const res = await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    })
    if (res.ok) {
      const json = await res.json()
      setFolders(prev => [...prev, { ...json.folder, translation_count: 0 }])
      setNewName('')
      setNewColor('#ef4444')
      setCreating(false)
    }
    setSaving(false)
  }

  const renameFolder = async (id: string) => {
    if (!renameValue.trim()) return
    const res = await fetch(`/api/folders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: renameValue.trim() }),
    })
    if (res.ok) {
      setFolders(prev => prev.map(f => f.id === id ? { ...f, name: renameValue.trim() } : f))
      if (selectedFolder?.id === id) setSelectedFolder(prev => prev ? { ...prev, name: renameValue.trim() } : prev)
    }
    setRenamingId(null)
  }

  const deleteFolder = async (id: string) => {
    if (!confirm('Supprimer ce dossier ? Les traductions seront conservées.')) return
    const res = await fetch(`/api/folders/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setFolders(prev => prev.filter(f => f.id !== id))
      if (selectedFolder?.id === id) setSelectedFolder(null)
    }
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

  // Folder detail view
  if (selectedFolder) {
    return (
      <div className="max-w-4xl mx-auto px-8 py-10">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => setSelectedFolder(null)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedFolder.color }} />
          <h1 className="text-xl font-bold text-gray-800">{selectedFolder.name}</h1>
          <span className="text-sm text-gray-400">{folderTranslations.length} traductions</span>
        </div>

        {!loadingTrans && folderTranslations.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <FolderOpen size={40} className="mx-auto mb-4 opacity-30" />
            <p>Ce dossier est vide.</p>
          </div>
        )}

        <div className="space-y-4">
          {folderTranslations.map(t => (
            <div
              key={t.id}
              className="border border-gray-100 rounded-2xl p-5 bg-white shadow-sm hover:shadow-md transition cursor-pointer"
              onClick={() => setOpenModal(t)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600">
                    {modeLabels[t.mode] ?? t.mode}
                  </span>
                  <span className="text-xs text-gray-400">{t.word_count} mots</span>
                  {t.is_favorite && <Star size={13} className="fill-yellow-400 text-yellow-400" />}
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(t.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Source</p>
                  <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{t.source_text}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1 text-right">Résultat</p>
                  <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed text-right" dir="rtl">{t.result_text}</p>
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
                <button onClick={() => setOpenModal(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition">
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Texte source</p>
                    <button onClick={() => copyText(openModal.source_text, 'source')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition">
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
                    <button onClick={() => copyText(openModal.result_text, 'result')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition">
                      {copiedResult ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                      {copiedResult ? 'Copié' : 'Copier'}
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap text-right" dir="rtl">{openModal.result_text}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Folders list view
  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FolderOpen size={20} className="text-red-500" />
          <h1 className="text-xl font-bold text-gray-800">Dossiers</h1>
          <span className="text-sm text-gray-400">{folders.length} dossiers</span>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition"
        >
          <Plus size={15} />
          Nouveau dossier
        </button>
      </div>

      {/* Create folder inline card */}
      {creating && (
        <div className="border border-red-100 rounded-2xl p-5 bg-red-50/30 mb-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Nouveau dossier</p>
          <div className="flex items-center gap-3 mb-3">
            <input
              autoFocus
              type="text"
              placeholder="Nom du dossier"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setCreating(false) }}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-200 bg-white"
            />
          </div>
          <div className="flex items-center gap-2 mb-4">
            {FOLDER_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={`w-6 h-6 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={createFolder}
              disabled={saving || !newName.trim()}
              className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition disabled:opacity-50"
            >
              {saving ? 'Création…' : 'Créer'}
            </button>
            <button
              onClick={() => { setCreating(false); setNewName('') }}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {!loading && folders.length === 0 && !creating && (
        <div className="text-center py-20 text-gray-400">
          <FolderOpen size={40} className="mx-auto mb-4 opacity-30" />
          <p>Aucun dossier pour le moment.</p>
          <p className="text-xs mt-1">Créez un dossier pour organiser vos traductions.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {folders.map(folder => (
          <div
            key={folder.id}
            className="border border-gray-100 rounded-2xl p-5 bg-white shadow-sm hover:shadow-md transition cursor-pointer group"
            onClick={() => openFolder(folder)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: folder.color + '22' }}
                >
                  <FolderOpen size={18} style={{ color: folder.color }} />
                </div>
                <div>
                  {renamingId === folder.id ? (
                    <input
                      autoFocus
                      type="text"
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => {
                        e.stopPropagation()
                        if (e.key === 'Enter') renameFolder(folder.id)
                        if (e.key === 'Escape') setRenamingId(null)
                      }}
                      onClick={e => e.stopPropagation()}
                      className="text-sm font-semibold text-gray-800 border-b border-gray-300 focus:outline-none bg-transparent w-32"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-gray-800">{folder.name}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {folder.translation_count} traduction{folder.translation_count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div
                className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition"
                onClick={e => e.stopPropagation()}
              >
                {renamingId === folder.id ? (
                  <>
                    <button
                      onClick={() => renameFolder(folder.id)}
                      className="p-1.5 rounded-lg text-green-500 hover:bg-green-50 transition"
                    >
                      <Check size={13} />
                    </button>
                    <button
                      onClick={() => setRenamingId(null)}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition"
                    >
                      <X size={13} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { setRenamingId(folder.id); setRenameValue(folder.name) }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                      title="Renommer"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => deleteFolder(folder.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                      title="Supprimer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
