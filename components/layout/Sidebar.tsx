'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Home, Clock, Star, LogOut, Settings, FolderOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { icon: Home, label: 'Accueil', href: '/' },
  { icon: Clock, label: 'Historique', href: '/history' },
  { icon: Star, label: 'Favoris', href: '/favorites' },
  { icon: FolderOpen, label: 'Dossiers', href: '/folders' },
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
    <aside className="w-[240px] min-h-screen flex flex-col border-r border-gray-100 bg-white">
      {/* Logo */}
      <div className="px-6 pt-8 pb-8 border-b border-gray-100">
        <Image
          src="/redaction_logo.png"
          alt="RedAction"
          width={160}
          height={60}
          className="object-contain"
          priority
        />
        <p className="text-[11px] text-gray-400 mt-2 font-medium tracking-wide uppercase">
          Éditeur arabe IA
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ icon: Icon, label, href }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-red-50 text-red-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon
                size={17}
                className={active ? 'text-red-500' : 'text-gray-400'}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-6 space-y-0.5 border-t border-gray-100 pt-3">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            pathname === '/settings'
              ? 'bg-red-50 text-red-600'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Settings
            size={17}
            className={pathname === '/settings' ? 'text-red-500' : 'text-gray-400'}
          />
          Paramètres
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all w-full"
        >
          <LogOut size={17} className="text-gray-400" />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
