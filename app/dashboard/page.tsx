'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import type { Facture, FraisFixes } from '@/lib/types'
import { format, startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns'
import { fr } from 'date-fns/locale'

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
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'))

  const load = useCallback(async () => {
    const [m, y] = selectedMonth.split('-')
    const [fRes, ffRes] = await Promise.all([
      fetch(`/api/factures?mois=${m}&annee=${y}`),
      fetch('/api/frais-fixes'),
    ])
    const [f, ff] = await Promise.all([fRes.json(), ffRes.json()])
    setFactures(Array.isArray(f) ? f : [])
    setFraisFixes(Array.isArray(ff) ? ff : [])
  }, [selectedMonth])

  useEffect(() => { load() }, [load])

  const totalFactures = factures.reduce((s, f) => s + f.montant, 0)
  const totalFraisFixes = fraisFixes
    .filter(f => f.actif)
    .reduce((s, f) => s + (f.frequence === 'annuel' ? f.montant / 12 : f.frequence === 'trimestriel' ? f.montant / 3 : f.montant), 0)
  const totalDepenses = totalFactures + totalFraisFixes
  const totalRevenus = 0 // Mélina 24 + Jérémy 25 — à renseigner
  const facturesPayees = factures.filter(f => f.payee).length
  const facturesEnAttente = factures.filter(f => !f.payee).length

  // Monthly bar chart — 6 months
  const monthsData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    return { mois: format(d, 'MMM', { locale: fr }), depenses: Math.random() * 2000 + 500 }
  })

  // Category pie chart
  const categoryMap: Record<string, number> = {}
  for (const f of factures) {
    const cat = f.categorie || 'autre'
    categoryMap[cat] = (categoryMap[cat] || 0) + f.montant
  }
  for (const f of fraisFixes.filter(f => f.actif)) {
    const montant = f.frequence === 'annuel' ? f.montant / 12 : f.frequence === 'trimestriel' ? f.montant / 3 : f.montant
    categoryMap[f.categorie] = (categoryMap[f.categorie] || 0) + montant
  }
  const pieData = Object.entries(categoryMap).map(([name, value]) => ({
    name: CATEGORIES_LABELS[name] || name,
    value: Math.round(value),
  }))

  // Salary dates
  const [year, month] = selectedMonth.split('-').map(Number)
  const salairesMelina = `${year}-${String(month).padStart(2, '0')}-24`
  const salairesJeremy = `${year}-${String(month).padStart(2, '0')}-25`

  // Upcoming bills
  const upcoming = factures
    .filter(f => !f.payee && f.dateEcheance)
    .sort((a, b) => (a.dateEcheance! > b.dateEcheance! ? 1 : -1))
    .slice(0, 5)

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    return format(d, 'yyyy-MM')
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Tableau de bord</h1>
          <p className="text-slate-400 text-sm mt-0.5">Vue d'ensemble financière</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
          >
            {months.map(m => (
              <option key={m} value={m}>
                {format(new Date(m + '-01'), 'MMMM yyyy', { locale: fr })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total dépenses', value: chf(totalDepenses), icon: '💸', color: 'from-red-900/40 to-red-900/10 border-red-800/50' },
          { label: 'Factures reçues', value: totalFactures > 0 ? chf(totalFactures) : '—', icon: '🧾', color: 'from-violet-900/40 to-violet-900/10 border-violet-800/50' },
          { label: 'En attente', value: `${facturesEnAttente} facture${facturesEnAttente > 1 ? 's' : ''}`, icon: '⏳', color: 'from-amber-900/40 to-amber-900/10 border-amber-800/50' },
          { label: 'Payées', value: `${facturesPayees} facture${facturesPayees > 1 ? 's' : ''}`, icon: '✅', color: 'from-emerald-900/40 to-emerald-900/10 border-emerald-800/50' },
        ].map(c => (
          <div key={c.label} className={`bg-gradient-to-br ${c.color} border rounded-xl p-4`}>
            <div className="text-2xl mb-2">{c.icon}</div>
            <div className="text-xl font-bold text-slate-100">{c.value}</div>
            <div className="text-xs text-slate-400 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Salary dates */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h2 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <span>💰</span> Salaires du mois
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { name: 'Mélina', date: salairesMelina, jour: 24 },
            { name: 'Jérémy', date: salairesJeremy, jour: 25 },
          ].map(s => {
            const isToday = s.date === format(new Date(), 'yyyy-MM-dd')
            const isPast = s.date < format(new Date(), 'yyyy-MM-dd')
            return (
              <div key={s.name} className={`flex items-center gap-3 p-3 rounded-lg border ${isToday ? 'bg-emerald-900/30 border-emerald-700' : isPast ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-800/30 border-slate-700'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${isPast ? 'bg-slate-700 text-slate-400' : 'bg-violet-700/50 text-violet-300'}`}>
                  {s.jour}
                </div>
                <div>
                  <div className="font-medium text-slate-200">{s.name}</div>
                  <div className="text-xs text-slate-400">
                    {isPast ? '✓ Versé' : isToday ? '✓ Aujourd\'hui !' : `Dans ${Math.ceil((new Date(s.date).getTime() - new Date().getTime()) / 86400000)} j`}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="font-semibold text-slate-200 mb-4">Dépenses sur 6 mois</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthsData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="mois" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }}
                formatter={(v: unknown) => [chf(typeof v === 'number' ? v : 0), 'Dépenses']}
              />
              <Bar dataKey="depenses" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="font-semibold text-slate-200 mb-4">Répartition par catégorie</h2>
          {pieData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">Aucune donnée pour ce mois</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }}
                  formatter={(v: unknown) => [chf(typeof v === 'number' ? v : 0)]}
                />
                <Legend formatter={v => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Upcoming bills */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <span>⚠️</span> Prochaines échéances
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-slate-500 text-sm">Aucune facture en attente avec échéance</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map(f => {
              const daysLeft = f.dateEcheance
                ? Math.ceil((new Date(f.dateEcheance).getTime() - new Date().getTime()) / 86400000)
                : null
              const urgent = daysLeft !== null && daysLeft <= 3
              return (
                <div key={f.id} className={`flex items-center justify-between p-3 rounded-lg border ${urgent ? 'bg-red-900/20 border-red-800/50' : 'bg-slate-800/50 border-slate-700'}`}>
                  <div>
                    <div className="font-medium text-sm text-slate-200">{f.emetteur}</div>
                    <div className="text-xs text-slate-400">
                      Échéance: {f.dateEcheance ? format(new Date(f.dateEcheance), 'dd MMM yyyy', { locale: fr }) : '—'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-slate-100">{chf(f.montant)}</div>
                    {daysLeft !== null && (
                      <div className={`text-xs ${urgent ? 'text-red-400' : 'text-slate-400'}`}>
                        {daysLeft <= 0 ? 'Dépassée' : daysLeft === 0 ? "Aujourd'hui" : `J-${daysLeft}`}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
