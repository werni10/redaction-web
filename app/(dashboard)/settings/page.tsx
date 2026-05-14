import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getUsage } from '@/lib/usage'
import { Settings, User, BarChart2 } from 'lucide-react'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const usage = await getUsage(user.id)

  return (
    <div className="max-w-2xl mx-auto px-8 py-10 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Settings size={20} className="text-pink-500" />
        <h1 className="text-xl font-bold text-gray-800">Paramètres</h1>
      </div>

      {/* Account */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
          <User size={16} className="text-purple-500" />
          Compte
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Email</p>
          <p className="text-sm font-medium text-gray-800">{user.email}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Membre depuis</p>
          <p className="text-sm text-gray-600">
            {new Date(user.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric', month: 'long', year: 'numeric'
            })}
          </p>
        </div>
      </div>

      {/* Usage */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <BarChart2 size={16} className="text-pink-500" />
          Utilisation — {usage.period}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4">
            <p className="text-3xl font-bold text-gray-800">{usage.wordCount.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">mots traités</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4">
            <p className="text-3xl font-bold text-gray-800">{usage.requestCount}</p>
            <p className="text-xs text-gray-500 mt-1">requêtes</p>
          </div>
        </div>
      </div>

      {/* Plan */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 text-white">
        <p className="text-sm font-semibold opacity-80 mb-1">Plan actuel</p>
        <p className="text-2xl font-bold">Accès complet</p>
        <p className="text-sm opacity-70 mt-2">
          Abonnements et facturation — disponibles bientôt.
        </p>
      </div>
    </div>
  )
}
