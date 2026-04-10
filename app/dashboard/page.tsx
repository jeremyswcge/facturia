'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import type { Facture, FraisFixes } from '@/lib/types'
import { format, subMonths } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1']

const CATEGORIES_LABELS: Record<string, string> = {
  loyer: 'Loyer', internet: 'Internet', tv: 'TV', mobile: 'Mobile',
  electricite: 'Électricité', eau: 'Eau', assurance: 'Assurance',
  transport: 'Transport', sante: 'Santé', alimentation: 'Alimentation',
  loisirs: 'Loisirs', autre: 'Autre',
}

function chf(n: number) {
  return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(n)
}

export default function Dashboard() {
  const [factures, setFactures] = useState<Facture[]>([])
  const [fraisFixes, setFraisFixes] = useState<FraisFixes[]>([])
  const [historique, setHistorique] = useState<{ mois: string; depenses: number }[]>([])
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'))
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    const [y, m] = selectedMonth.split('-')

    // Chargement mois sélectionné + frais fixes
    const [fRes, ffRes] = await Promise.all([
      fetch(`/api/factures?mois=${m}&annee=${y}`),
      fetch('/api/frais-fixes'),
    ])
    const [f, ff] = await Promise.all([fRes.json(), ffRes.json()])
    setFactures(Array.isArray(f) ? f : [])
    setFraisFixes(Array.isArray(ff) ? ff : [])

    // Chargement historique 6 mois pour le bar chart
    const now = new Date()
    const sixMonthsData = await Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(now, 5 - i)
        const mo = String(d.getMonth() + 1).padStart(2, '0')
        const yr = d.getFullYear()
        return fetch(`/api/factures?mois=${mo}&annee=${yr}`)
          .then(r => r.json())
          .then((data: Facture[]) => ({
            mois: format(d, 'MMM', { locale: fr }),
            depenses: Array.isArray(data) ? data.reduce((s, x) => s + (x.montant || 0), 0) : 0,
          }))
      })
    )
    setHistorique(sixMonthsData)
    setLoading(false)
  }, [selectedMonth])

  useEffect(() => { load() }, [load])

  const totalFactures = factures.reduce((s, f) => s + (f.montant || 0), 0)
  const totalFraisFixes = fraisFixes
    .filter(f => f.actif)
    .reduce((s, f) => s + (f.frequence === 'annuel' ? f.montant / 12 : f.frequence === 'trimestriel' ? f.montant / 3 : f.montant), 0)
  const totalDepenses = totalFactures + totalFraisFixes

  // Frais fixes par utilisateur (mensualisé)
  const fraisFixesByUser: Record<string, number> = { jeremy: 0, melina: 0, chloe: 0, commun: 0 }
  for (const f of fraisFixes.filter(x => x.actif)) {
    const m = f.frequence === 'annuel' ? f.montant / 12 : f.frequence === 'trimestriel' ? f.montant / 3 : f.montant
    const u = f.utilisateur || 'commun'
    fraisFixesByUser[u] = (fraisFixesByUser[u] || 0) + m
  }
  const FRAIS_USERS = [
    { value: 'jeremy', label: 'Jérémy', color: 'text-blue-400', bg: 'bg-blue-900/20 border-blue-800/50' },
    { value: 'melina', label: 'Mélina', color: 'text-pink-400', bg: 'bg-pink-900/20 border-pink-800/50' },
    { value: 'chloe', label: 'Chloé', color: 'text-purple-400', bg: 'bg-purple-900/20 border-purple-800/50' },
    { value: 'commun', label: 'Commun', color: 'text-slate-300', bg: 'bg-slate-800/50 border-slate-700' },
  ]
  const facturesPayees = factures.filter(f => f.payee).length
  const facturesEnAttente = factures.filter(f => !f.payee).length
  const montantEnAttente = factures.filter(f => !f.payee).reduce((s, f) => s + (f.montant || 0), 0)

  // Pie chart — répartition par catégorie
  const categoryMap: Record<string, number> = {}
  for (const f of factures) {
    const cat = f.categorie || 'autre'
    categoryMap[cat] = (categoryMap[cat] || 0) + f.montant
  }
  for (const f of fraisFixes.filter(f => f.actif)) {
    const montant = f.frequence === 'annuel' ? f.montant / 12 : f.frequence === 'trimestriel' ? f.montant / 3 : f.montant
    categoryMap[f.categorie] = (categoryMap[f.categorie] || 0) + montant
  }
  const pieData = Object.entries(categoryMap)
    .map(([name, value]) => ({ name: CATEGORIES_LABELS[name] || name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)

  // Salaires
  const [year, month] = selectedMonth.split('-').map(Number)
  const dateMelina = `${year}-${String(month).padStart(2, '0')}-24`
  const dateJeremy = `${year}-${String(month).padStart(2, '0')}-25`

  // Prochaines échéances (toutes factures non payées avec échéance)
  const upcoming = factures
    .filter(f => !f.payee && f.dateEcheance)
    .sort((a, b) => (a.dateEcheance! > b.dateEcheance! ? 1 : -1))
    .slice(0, 5)

  // Dernières factures ajoutées
  const dernieresFactures = [...factures]
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, 4)

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), i)
    return format(d, 'yyyy-MM')
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Tableau de bord</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {format(new Date(selectedMonth + '-01'), 'MMMM yyyy', { locale: fr })}
          </p>
        </div>
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500 self-start sm:self-auto"
        >
          {months.map(m => (
            <option key={m} value={m}>
              {format(new Date(m + '-01'), 'MMMM yyyy', { locale: fr })}
            </option>
          ))}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total dépenses', value: chf(totalDepenses), icon: '💸', color: 'from-red-900/40 to-red-900/10 border-red-800/50' },
          { label: 'À payer', value: montantEnAttente > 0 ? chf(montantEnAttente) : '—', icon: '⏳', color: 'from-amber-900/40 to-amber-900/10 border-amber-800/50' },
          { label: 'Factures payées', value: `${facturesPayees}`, icon: '✅', color: 'from-emerald-900/40 to-emerald-900/10 border-emerald-800/50' },
          { label: 'Frais fixes/mois', value: chf(totalFraisFixes), icon: '📌', color: 'from-violet-900/40 to-violet-900/10 border-violet-800/50' },
        ].map(c => (
          <div key={c.label} className={`bg-gradient-to-br ${c.color} border rounded-xl p-4`}>
            <div className="text-2xl mb-2">{c.icon}</div>
            <div className="text-lg font-bold text-slate-100 truncate">{c.value}</div>
            <div className="text-xs text-slate-400 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Salaires */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h2 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <span>💰</span> Salaires du mois
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: 'Mélina', date: dateMelina, jour: 24 },
            { name: 'Jérémy', date: dateJeremy, jour: 25 },
          ].map(s => {
            const today = format(new Date(), 'yyyy-MM-dd')
            const isToday = s.date === today
            const isPast = s.date < today
            const daysLeft = Math.ceil((new Date(s.date).getTime() - new Date().getTime()) / 86400000)
            return (
              <div key={s.name} className={`flex items-center gap-3 p-3 rounded-xl border ${isToday ? 'bg-emerald-900/30 border-emerald-700' : isPast ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-800/30 border-slate-700'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isPast ? 'bg-slate-700 text-slate-400' : 'bg-violet-700/50 text-violet-300'}`}>
                  {s.jour}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-slate-200 text-sm">{s.name}</div>
                  <div className={`text-xs ${isToday ? 'text-emerald-400' : isPast ? 'text-slate-500' : 'text-slate-400'}`}>
                    {isPast ? '✓ Versé' : isToday ? "Aujourd'hui !" : `Dans ${daysLeft}j`}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Frais fixes par utilisateur */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <span>📌</span> Frais fixes par utilisateur
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {FRAIS_USERS.map(u => (
            <div key={u.value} className={`border rounded-xl p-3 ${u.bg}`}>
              <div className={`text-xs font-medium ${u.color}`}>{u.label}</div>
              <div className="text-lg font-bold text-slate-100 mt-1">{chf(fraisFixesByUser[u.value] || 0)}</div>
              <div className="text-[10px] text-slate-500">/mois</div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Bar chart 6 mois */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="font-semibold text-slate-200 mb-4">Factures sur 6 mois</h2>
          {historique.every(h => h.depenses === 0) ? (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">Aucune facture sur cette période</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={historique} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="mois" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }}
                  formatter={(v: unknown) => [chf(typeof v === 'number' ? v : 0), 'Factures']}
                />
                <Bar dataKey="depenses" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="font-semibold text-slate-200 mb-4">Répartition par catégorie</h2>
          {pieData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">Aucune donnée pour ce mois</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }}
                  formatter={(v: unknown) => [chf(typeof v === 'number' ? v : 0)]}
                />
                <Legend formatter={v => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Prochaines échéances */}
      {upcoming.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <span>⚠️</span> Prochaines échéances
          </h2>
          <div className="space-y-2">
            {upcoming.map(f => {
              const daysLeft = Math.ceil((new Date(f.dateEcheance!).getTime() - new Date().getTime()) / 86400000)
              const urgent = daysLeft <= 3
              return (
                <div key={f.id} className={`flex items-center justify-between p-3 rounded-xl border ${urgent ? 'bg-red-900/20 border-red-800/50' : 'bg-slate-800/50 border-slate-700'}`}>
                  <div>
                    <div className="font-medium text-sm text-slate-200">{f.emetteur}</div>
                    <div className="text-xs text-slate-400">
                      {format(new Date(f.dateEcheance!), 'dd MMM yyyy', { locale: fr })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-slate-100">{chf(f.montant)}</div>
                    <div className={`text-xs ${urgent ? 'text-red-400' : 'text-slate-400'}`}>
                      {daysLeft <= 0 ? 'Dépassée' : `J-${daysLeft}`}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Dernières factures ajoutées */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-200 flex items-center gap-2"><span>🧾</span> Factures du mois</h2>
          <Link href="/factures" className="text-xs text-violet-400 hover:text-violet-300">Voir tout →</Link>
        </div>
        {loading ? (
          <div className="text-slate-500 text-sm text-center py-4">Chargement...</div>
        ) : dernieresFactures.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm">Aucune facture ce mois-ci</p>
            <Link href="/factures" className="mt-2 inline-block text-sm text-violet-400 hover:text-violet-300">
              + Ajouter une facture
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {dernieresFactures.map(f => (
              <div key={f.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-opacity ${f.payee ? 'opacity-50 border-slate-800' : 'border-slate-700'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${f.payee ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-600'}`}>
                  {f.payee && <span className="text-xs">✓</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${f.payee ? 'line-through text-slate-500' : 'text-slate-200'}`}>{f.emetteur}</div>
                  <div className="text-xs text-slate-500">
                    {f.dateReception ? format(new Date(f.dateReception), 'dd MMM', { locale: fr }) : ''}
                    {f.dateEcheance ? ` · éch. ${format(new Date(f.dateEcheance), 'dd MMM', { locale: fr })}` : ''}
                  </div>
                </div>
                <div className={`font-semibold text-sm flex-shrink-0 ${f.payee ? 'text-slate-500' : 'text-slate-100'}`}>
                  {chf(f.montant)}
                </div>
              </div>
            ))}
            {factures.length > 4 && (
              <Link href="/factures" className="block text-center text-xs text-slate-500 hover:text-violet-400 pt-1">
                +{factures.length - 4} autre{factures.length - 4 > 1 ? 's' : ''} →
              </Link>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
