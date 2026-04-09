'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from './AuthProvider'
import { logout } from '@/lib/auth'

const links = [
  { href: '/dashboard', label: 'Tableau de bord', icon: '📊' },
  { href: '/factures', label: 'Factures', icon: '🧾' },
  { href: '/frais-fixes', label: 'Frais fixes', icon: '📌' },
]

export default function Nav() {
  const pathname = usePathname()
  const { user } = useAuth()

  return (
    <>
      {/* Desktop top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 h-16 flex items-center px-6">
        <div className="flex items-center gap-3 mr-10">
          <img src="/icons/icon-192.png" alt="Facturia" className="w-8 h-8 rounded-lg" />
          <span className="font-semibold text-lg tracking-tight">Facturia</span>
        </div>
        <nav className="hidden md:flex gap-1 flex-1">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith(l.href)
                  ? 'bg-violet-600/20 text-violet-300'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>{l.icon}</span>
              {l.label}
            </Link>
          ))}
        </nav>
        {user && (
          <div className="hidden md:flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-2">
              {user.photoURL && (
                <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full" />
              )}
              <span className="text-xs text-slate-400">{user.displayName || user.email}</span>
            </div>
            <button
              onClick={logout}
              className="text-xs text-slate-500 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-900/20"
            >
              Déconnexion
            </button>
          </div>
        )}
      </header>

      {/* Mobile bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-slate-900/95 backdrop-blur border-t border-slate-800 flex">
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
              pathname.startsWith(l.href)
                ? 'text-violet-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <span className="text-xl">{l.icon}</span>
            <span className="hidden sm:block">{l.label}</span>
          </Link>
        ))}
        {user && (
          <button
            onClick={logout}
            className="flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium text-slate-500 hover:text-red-400 transition-colors"
          >
            <span className="text-xl">🚪</span>
          </button>
        )}
      </nav>
    </>
  )
}
