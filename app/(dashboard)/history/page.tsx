import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Clock, Trash2 } from 'lucide-react'
import DeleteTranslationButton from './DeleteTranslationButton'

const modeLabels: Record<string, string> = {
  general: 'General',
  ocp: 'OCP',
  arabic_rewrite: 'Arabic Rewrite',
}

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: translations } = await supabase
    .from('translations')
    .select('id, mode, source_text, result_text, word_count, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Clock size={20} className="text-pink-500" />
        <h1 className="text-xl font-bold text-gray-800">Historique</h1>
        <span className="text-sm text-gray-400">{translations?.length ?? 0} traductions</span>
      </div>

      {!translations?.length && (
        <div className="text-center py-20 text-gray-400">
          <Clock size={40} className="mx-auto mb-4 opacity-30" />
          <p>Aucune traduction pour le moment.</p>
        </div>
      )}

      <div className="space-y-4">
        {translations?.map(t => (
          <div key={t.id} className="border border-gray-100 rounded-2xl p-5 bg-white shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-pink-50 text-pink-600">
                  {modeLabels[t.mode] ?? t.mode}
                </span>
                <span className="text-xs text-gray-400">
                  {t.word_count} mots
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  {new Date(t.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </span>
                <DeleteTranslationButton id={t.id} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
    </div>
  )
}
