'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Clock, Star, LogOut, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { icon: Home, label: 'Accueil', href: '/' },
  { icon: Clock, label: 'Historique', href: '/history' },
  { icon: Star, label: 'Favoris', href: '/favorites' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-[220px] min-h-screen flex flex-col border-r border-gray-100 bg-gradient-to-b from-pink-50/40 via-white to-white">
      {/* Logo */}
      <div className="px-6 pt-8 pb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
          RedAction
        </h1>
        <p className="text-[11px] text-gray-400 mt-0.5">Éditeur arabe IA</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map(({ icon: Icon, label, href }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-pink-50 text-pink-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={18} className={active ? 'text-pink-500' : 'text-gray-400'} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-4 pb-6 space-y-1">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            pathname === '/settings'
              ? 'bg-pink-50 text-pink-600'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Settings size={18} className="text-gray-400" />
          Paramètres
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors w-full"
        >
          <LogOut size={18} className="text-gray-400" />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
