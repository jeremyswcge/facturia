'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { isAdmin } from '@/lib/auth'
import { logout } from '@/lib/auth'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Connexion {
  id: string
  email: string
  displayName: string
  photoURL: string
  timestamp: string
}

const MEMBERS: Record<string, { label: string; color: string }> = {
  'jeremyswcge@gmail.com': { label: 'Jérémy', color: 'text-blue-400' },
  'bergermelina2@gmail.com': { label: 'Mélina', color: 'text-pink-400' },
}

export default function ProfilPage() {
  const { user } = useAuth()
  const admin = isAdmin(user?.email ?? null)
  const [connexions, setConnexions] = useState<Connexion[]>([])
  const [loadingConnexions, setLoadingConnexions] = useState(false)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (!admin) return
    setLoadingConnexions(true)
    fetch('/api/connexions')
      .then(r => r.json())
      .then(data => setConnexions(Array.isArray(data) ? data : []))
      .finally(() => setLoadingConnexions(false))
  }, [admin])

  if (!user) return null

  const myInfo = MEMBERS[user.email?.toLowerCase() ?? '']

  // Group connexions by member (excluding self for admin, or only others)
  const otherConnexions = connexions.filter(c => c.email.toLowerCase() !== user.email?.toLowerCase())
  const myConnexions = connexions.filter(c => c.email.toLowerCase() === user.email?.toLowerCase())
  const displayedOthers = showAll ? otherConnexions : otherConnexions.slice(0, 10)

  function formatDate(ts: string) {
    try {
      return format(new Date(ts), "dd MMM yyyy 'à' HH:mm", { locale: fr })
    } catch {
      return ts
    }
  }

  function timeSince(ts: string) {
    const diff = Date.now() - new Date(ts).getTime()
    const min = Math.floor(diff / 60000)
    if (min < 1) return 'À l\'instant'
    if (min < 60) return `Il y a ${min} min`
    const h = Math.floor(min / 60)
    if (h < 24) return `Il y a ${h}h`
    const d = Math.floor(h / 24)
    return `Il y a ${d}j`
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 fade-in">
      <h1 className="text-2xl font-bold text-slate-100">Mon profil</h1>

      {/* User card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
        {user.photoURL ? (
          <img src={user.photoURL} alt="" className="w-16 h-16 rounded-full ring-2 ring-violet-600/40" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-violet-600/20 flex items-center justify-center text-2xl">👤</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-100 text-lg truncate">{user.displayName || 'Utilisateur'}</div>
          <div className="text-sm text-slate-400 truncate">{user.email}</div>
          <div className="flex items-center gap-2 mt-1.5">
            {admin && (
              <span className="text-xs bg-violet-900/50 text-violet-300 border border-violet-700/50 px-2 py-0.5 rounded-full font-medium">
                Admin
              </span>
            )}
            {myInfo && (
              <span className={`text-xs ${myInfo.color} font-medium`}>{myInfo.label}</span>
            )}
          </div>
        </div>
        <button
          onClick={logout}
          className="text-xs text-slate-500 hover:text-red-400 transition-colors px-3 py-2 rounded-lg hover:bg-red-900/20 flex-shrink-0"
        >
          Déconnexion
        </button>
      </div>

      {/* Ma dernière connexion */}
      {myConnexions.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Mes dernières connexions</h2>
          <div className="space-y-2">
            {myConnexions.slice(0, 5).map(c => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{formatDate(c.timestamp)}</span>
                <span className="text-xs text-slate-600">{timeSince(c.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin — connexions des membres */}
      {admin && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-300">Connexions des membres</h2>
            <span className="text-xs text-violet-400 bg-violet-900/30 px-2 py-0.5 rounded-full">Admin uniquement</span>
          </div>

          {loadingConnexions ? (
            <div className="text-slate-500 text-sm text-center py-6">Chargement...</div>
          ) : otherConnexions.length === 0 ? (
            <div className="text-slate-500 text-sm text-center py-6">Aucune connexion enregistrée</div>
          ) : (
            <>
              <div className="space-y-2">
                {displayedOthers.map(c => {
                  const member = MEMBERS[c.email.toLowerCase()]
                  return (
                    <div key={c.id} className="flex items-center gap-3 py-2 border-b border-slate-800 last:border-0">
                      {c.photoURL ? (
                        <img src={c.photoURL} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm flex-shrink-0">👤</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${member?.color ?? 'text-slate-300'}`}>
                            {member?.label ?? c.displayName ?? c.email}
                          </span>
                          <span className="text-xs text-slate-600 truncate hidden sm:block">{c.email}</span>
                        </div>
                        <div className="text-xs text-slate-500">{formatDate(c.timestamp)}</div>
                      </div>
                      <span className="text-xs text-slate-600 flex-shrink-0">{timeSince(c.timestamp)}</span>
                    </div>
                  )
                })}
              </div>
              {otherConnexions.length > 10 && (
                <button
                  onClick={() => setShowAll(v => !v)}
                  className="mt-3 w-full text-xs text-slate-500 hover:text-slate-300 transition-colors py-2"
                >
                  {showAll ? 'Voir moins' : `Voir les ${otherConnexions.length - 10} connexions plus anciennes`}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
