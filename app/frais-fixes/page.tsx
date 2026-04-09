'use client'

import { useEffect, useState, useCallback } from 'react'
import type { FraisFixes } from '@/lib/types'

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

const FREQUENCES = [
  { value: 'mensuel', label: 'Mensuel' },
  { value: 'trimestriel', label: 'Trimestriel' },
  { value: 'annuel', label: 'Annuel' },
]

function chf(n: number) {
  return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(n)
}

function montantMensuel(f: FraisFixes): number {
  if (f.frequence === 'annuel') return f.montant / 12
  if (f.frequence === 'trimestriel') return f.montant / 3
  return f.montant
}

const emptyForm: {
  nom: string; montant: string; frequence: 'mensuel' | 'annuel' | 'trimestriel'
  categorie: string; jourPrelevement: string
} = {
  nom: '', montant: '', frequence: 'mensuel',
  categorie: 'autre', jourPrelevement: '',
}

export default function FraisFixesPage() {
  const [frais, setFrais] = useState<FraisFixes[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<typeof emptyForm>(emptyForm)
  const [saving, setSaving] = useState(false)

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

  const totalMensuel = frais.filter(f => f.actif).reduce((s, f) => s + montantMensuel(f), 0)

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
    })
    setShowModal(true)
  }

  async function save() {
    if (!form.nom || !form.montant) return
    setSaving(true)
    const data = {
      nom: form.nom,
      montant: parseFloat(form.montant),
      frequence: form.frequence,
      categorie: form.categorie,
      jourPrelevement: form.jourPrelevement ? parseInt(form.jourPrelevement) : undefined,
      actif: true,
    }
    if (editId) {
      await fetch('/api/frais-fixes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', id: editId, data }),
      })
    } else {
      await fetch('/api/frais-fixes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      })
    }
    setSaving(false)
    setShowModal(false)
    load()
  }

  // Group by category
  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    items: frais.filter(f => f.categorie === cat.value),
  })).filter(g => g.items.length > 0)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Frais fixes</h1>
          <p className="text-slate-400 text-sm mt-0.5">Total mensuel : <span className="text-violet-400 font-semibold">{chf(totalMensuel)}</span></p>
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
                  <div key={f.id} className={`flex items-center gap-4 px-4 py-3 transition-opacity ${f.actif ? '' : 'opacity-50'}`}>
                    <button
                      onClick={() => toggleActif(f)}
                      className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 ${f.actif ? 'bg-violet-600' : 'bg-slate-700'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${f.actif ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-slate-200">{f.nom}</div>
                      <div className="text-xs text-slate-500">
                        {FREQUENCES.find(fr => fr.value === f.frequence)?.label}
                        {f.jourPrelevement ? ` · prélèvement le ${f.jourPrelevement}` : ''}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="font-semibold text-sm text-slate-100">{chf(f.montant)}</div>
                      {f.frequence !== 'mensuel' && (
                        <div className="text-xs text-slate-500">{chf(montantMensuel(f))}/mois</div>
                      )}
                    </div>

                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEdit(f)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteFrais(f.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                      >
                        🗑
                      </button>
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
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="font-bold text-lg text-slate-100 mb-5">
              {editId ? 'Modifier le frais fixe' : 'Nouveau frais fixe'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nom *</label>
                <input
                  value={form.nom}
                  onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
                  placeholder="Loyer, Swisscom, Netflix..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Montant CHF *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.montant}
                    onChange={e => setForm(p => ({ ...p, montant: e.target.value }))}
                    placeholder="0.00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Fréquence</label>
                  <select
                    value={form.frequence}
                    onChange={e => setForm(p => ({ ...p, frequence: e.target.value as any }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                  >
                    {FREQUENCES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Catégorie</label>
                  <select
                    value={form.categorie}
                    onChange={e => setForm(p => ({ ...p, categorie: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                  >
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Jour prélèvement</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={form.jourPrelevement}
                    onChange={e => setForm(p => ({ ...p, jourPrelevement: e.target.value }))}
                    placeholder="1-31"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-slate-700 text-slate-400 hover:text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={save}
                disabled={saving || !form.nom || !form.montant}
                className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
