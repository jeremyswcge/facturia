'use client'

import { useEffect, useState, useCallback } from 'react'
import type { FraisFixes } from '@/lib/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const CATEGORIES = [
  { value: 'loyer', label: 'Loyer', icon: '🏠' },
  { value: 'internet', label: 'Internet', icon: '🌐' },
  { value: 'tv', label: 'TV', icon: '📺' },
  { value: 'mobile', label: 'Mobile', icon: '📱' },
  { value: 'electricite', label: 'Électricité', icon: '⚡' },
  { value: 'eau', label: 'Eau', icon: '💧' },
  { value: 'assurance', label: 'Assurance', icon: '🛡️' },
  { value: 'transport', label: 'Transport', icon: '🚌' },
  { value: 'sante', label: 'Santé', icon: '🏥' },
  { value: 'alimentation', label: 'Alimentation', icon: '🛒' },
  { value: 'loisirs', label: 'Loisirs', icon: '🎮' },
  { value: 'autre', label: 'Autre', icon: '📦' },
]

const MOIS = [
  { value: '01', label: 'Janvier' }, { value: '02', label: 'Février' },
  { value: '03', label: 'Mars' }, { value: '04', label: 'Avril' },
  { value: '05', label: 'Mai' }, { value: '06', label: 'Juin' },
  { value: '07', label: 'Juillet' }, { value: '08', label: 'Août' },
  { value: '09', label: 'Septembre' }, { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' }, { value: '12', label: 'Décembre' },
]

const ANNEES = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 1 + i))

const UTILISATEURS = [
  { value: 'jeremy', label: 'Jérémy', color: 'bg-blue-600', light: 'bg-blue-900/40 text-blue-400' },
  { value: 'melina', label: 'Mélina', color: 'bg-pink-600', light: 'bg-pink-900/40 text-pink-400' },
  { value: 'chloe', label: 'Chloé', color: 'bg-purple-600', light: 'bg-purple-900/40 text-purple-400' },
  { value: 'commun', label: 'Commun', color: 'bg-slate-600', light: 'bg-slate-800 text-slate-400' },
] as const

function chf(n: number) {
  return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(n)
}

function montantMensuel(f: FraisFixes): number {
  if (f.frequence === 'annuel') {
    if (f.modeAnnuel === 'paiement-unique') return f.montant // affiché en totalité le mois du paiement
    return f.montant / 12
  }
  if (f.frequence === 'trimestriel') return f.montant / 3
  return f.montant
}

function labelFrequence(f: FraisFixes): string {
  if (f.frequence === 'mensuel') return 'Mensuel'
  if (f.frequence === 'trimestriel') return 'Trimestriel'
  if (f.frequence === 'annuel') {
    if (f.modeAnnuel === 'paiement-unique') {
      const m = MOIS.find(x => x.value === f.moisPaiementAnnuel)?.label || ''
      return `Annuel · paiement unique${m ? ` en ${m}` : ''} ${f.anneePaiementAnnuel || ''}`
    }
    return 'Annuel · mensualité'
  }
  return ''
}

type FormType = {
  nom: string
  montant: string
  frequence: 'mensuel' | 'annuel' | 'trimestriel'
  categorie: string
  jourPrelevement: string
  moisDebut: string
  anneeDebut: string
  modeAnnuel: 'mensualise' | 'paiement-unique'
  moisPaiementAnnuel: string
  anneePaiementAnnuel: string
  utilisateur: 'jeremy' | 'melina' | 'chloe' | 'commun'
}

const now = new Date()
const emptyForm: FormType = {
  nom: '', montant: '', frequence: 'mensuel',
  categorie: 'autre', jourPrelevement: '',
  moisDebut: String(now.getMonth() + 1).padStart(2, '0'),
  anneeDebut: String(now.getFullYear()),
  modeAnnuel: 'mensualise',
  moisPaiementAnnuel: String(now.getMonth() + 1).padStart(2, '0'),
  anneePaiementAnnuel: String(now.getFullYear()),
  utilisateur: 'commun',
}

export default function FraisFixesPage() {
  const [frais, setFrais] = useState<FraisFixes[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormType>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const set = (k: keyof FormType, v: string) => setForm(p => ({ ...p, [k]: v }))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/frais-fixes')
      const data = await res.json()
      setFrais(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const totalMensuel = frais
    .filter(f => f.actif && f.modeAnnuel !== 'paiement-unique')
    .reduce((s, f) => s + montantMensuel(f), 0)

  async function toggleActif(f: FraisFixes) {
    await fetch('/api/frais-fixes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id: f.id, data: { actif: !f.actif } }),
    })
    setFrais(prev => prev.map(x => x.id === f.id ? { ...x, actif: !x.actif } : x))
  }

  async function deleteFrais(id: string) {
    if (!confirm('Supprimer ce frais fixe ?')) return
    await fetch('/api/frais-fixes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    })
    setFrais(prev => prev.filter(f => f.id !== id))
  }

  function openNew() {
    setEditId(null)
    setForm(emptyForm)
    setSaveError('')
    setShowModal(true)
  }

  function openEdit(f: FraisFixes) {
    setEditId(f.id)
    setForm({
      nom: f.nom,
      montant: String(f.montant),
      frequence: f.frequence,
      categorie: f.categorie,
      jourPrelevement: f.jourPrelevement ? String(f.jourPrelevement) : '',
      moisDebut: f.moisDebut || String(now.getMonth() + 1).padStart(2, '0'),
      anneeDebut: f.anneeDebut || String(now.getFullYear()),
      modeAnnuel: f.modeAnnuel || 'mensualise',
      moisPaiementAnnuel: f.moisPaiementAnnuel || String(now.getMonth() + 1).padStart(2, '0'),
      anneePaiementAnnuel: f.anneePaiementAnnuel || String(now.getFullYear()),
      utilisateur: f.utilisateur || 'commun',
    })
    setSaveError('')
    setShowModal(true)
  }

  async function save() {
    if (!form.nom || !form.montant) return
    setSaving(true)
    setSaveError('')
    try {
      const data: Partial<FraisFixes> = {
        nom: form.nom,
        montant: parseFloat(form.montant),
        frequence: form.frequence,
        categorie: form.categorie,
        jourPrelevement: form.jourPrelevement ? parseInt(form.jourPrelevement) : undefined,
        moisDebut: form.moisDebut,
        anneeDebut: form.anneeDebut,
        utilisateur: form.utilisateur,
        actif: true,
      }
      if (form.frequence === 'annuel') {
        data.modeAnnuel = form.modeAnnuel
        if (form.modeAnnuel === 'paiement-unique') {
          data.moisPaiementAnnuel = form.moisPaiementAnnuel
          data.anneePaiementAnnuel = form.anneePaiementAnnuel
        }
      }
      const res = await fetch('/api/frais-fixes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editId ? { action: 'update', id: editId, data } : { data }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error || 'Erreur serveur')
      setShowModal(false)
      load()
    } catch (err: any) {
      setSaveError(err.message || 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    items: frais.filter(f => f.categorie === cat.value),
  })).filter(g => g.items.length > 0)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Frais fixes</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Mensualités : <span className="text-violet-400 font-semibold">{chf(totalMensuel)}</span>/mois
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Ajouter un frais fixe
        </button>
      </div>

      {loading ? (
        <div className="text-slate-500 text-center py-12">Chargement...</div>
      ) : frais.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">📌</div>
          <p className="text-slate-400">Aucun frais fixe configuré</p>
          <p className="text-slate-500 text-sm mt-1">Ajoutez votre loyer, internet, abonnements...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(group => (
            <div key={group.value} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-slate-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{group.icon}</span>
                  <span className="font-medium text-sm text-slate-300">{group.label}</span>
                </div>
                <span className="text-xs text-slate-400">
                  {chf(group.items.filter(f => f.actif).reduce((s, f) => s + montantMensuel(f), 0))}/mois
                </span>
              </div>
              <div className="divide-y divide-slate-800">
                {group.items.map(f => (
                  <div key={f.id} className={`flex items-center gap-3 px-4 py-3 transition-opacity ${f.actif ? '' : 'opacity-50'}`}>
                    <button
                      onClick={() => toggleActif(f)}
                      className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 ${f.actif ? 'bg-violet-600' : 'bg-slate-700'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${f.actif ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-slate-200 truncate">{f.nom}</span>
                        {(() => {
                          const u = UTILISATEURS.find(x => x.value === (f.utilisateur || 'commun'))
                          return u ? <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${u.light}`}>{u.label}</span> : null
                        })()}
                      </div>
                      <div className="text-xs text-slate-500">
                        {labelFrequence(f)}
                        {f.jourPrelevement ? ` · le ${f.jourPrelevement}` : ''}
                        {f.moisDebut && f.anneeDebut ? ` · dès ${MOIS.find(m => m.value === f.moisDebut)?.label} ${f.anneeDebut}` : ''}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="font-semibold text-sm text-slate-100">{chf(f.montant)}</div>
                      {f.frequence !== 'mensuel' && f.modeAnnuel !== 'paiement-unique' && (
                        <div className="text-xs text-slate-500">{chf(montantMensuel(f))}/mois</div>
                      )}
                    </div>

                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => openEdit(f)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors">✏️</button>
                      <button onClick={() => deleteFrais(f.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-900/20 transition-colors">🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl max-h-[90dvh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 flex-shrink-0">
              <h2 className="font-bold text-base text-slate-100">
                {editId ? 'Modifier' : 'Nouveau frais fixe'}
              </h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 text-lg">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Nom */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Nom *</label>
                <input
                  value={form.nom}
                  onChange={e => set('nom', e.target.value)}
                  placeholder="Loyer, Swisscom, Netflix..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Montant + Fréquence */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Montant CHF *</label>
                  <input
                    type="number" step="0.01" inputMode="decimal"
                    value={form.montant}
                    onChange={e => set('montant', e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Fréquence</label>
                  <select
                    value={form.frequence}
                    onChange={e => set('frequence', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                  >
                    <option value="mensuel">Mensuel</option>
                    <option value="trimestriel">Trimestriel</option>
                    <option value="annuel">Annuel</option>
                  </select>
                </div>
              </div>

              {/* Options annuel */}
              {form.frequence === 'annuel' && (
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-medium text-slate-300">Mode de paiement annuel</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'mensualise', label: 'Mensualités', sub: `${form.montant ? chf(parseFloat(form.montant) / 12) : 'CHF —'}/mois` },
                      { value: 'paiement-unique', label: 'Paiement unique', sub: 'Un seul mois' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => set('modeAnnuel', opt.value)}
                        className={`flex flex-col items-start p-3 rounded-xl border text-left transition-colors ${form.modeAnnuel === opt.value ? 'bg-violet-600/20 border-violet-500 text-violet-300' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}
                      >
                        <span className="text-sm font-medium">{opt.label}</span>
                        <span className="text-xs mt-0.5 opacity-70">{opt.sub}</span>
                      </button>
                    ))}
                  </div>

                  {/* Mois/année du paiement unique */}
                  {form.modeAnnuel === 'paiement-unique' && (
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Mois et année du paiement</label>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={form.moisPaiementAnnuel}
                          onChange={e => set('moisPaiementAnnuel', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                        >
                          {MOIS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                        <select
                          value={form.anneePaiementAnnuel}
                          onChange={e => set('anneePaiementAnnuel', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                        >
                          {ANNEES.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Catégorie + Jour prélèvement */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Catégorie</label>
                  <select
                    value={form.categorie}
                    onChange={e => set('categorie', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                  >
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Jour prélèvement</label>
                  <input
                    type="number" min="1" max="31"
                    value={form.jourPrelevement}
                    onChange={e => set('jourPrelevement', e.target.value)}
                    placeholder="1-31"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Utilisateur */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Appartient à</label>
                <div className="grid grid-cols-4 gap-2">
                  {UTILISATEURS.map(u => (
                    <button
                      key={u.value}
                      type="button"
                      onClick={() => set('utilisateur', u.value)}
                      className={`px-2 py-2 rounded-xl text-xs font-medium border transition-colors ${form.utilisateur === u.value ? `${u.color} text-white border-transparent` : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mois et année de début */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Mois / Année de début</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={form.moisDebut}
                    onChange={e => set('moisDebut', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                  >
                    {MOIS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <select
                    value={form.anneeDebut}
                    onChange={e => set('anneeDebut', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                  >
                    {ANNEES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              {saveError && (
                <div className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{saveError}</div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-slate-800 flex-shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-slate-700 text-slate-400 hover:text-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={save}
                disabled={saving || !form.nom || !form.montant}
                className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Enregistrement...</> : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
