'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Facture } from '@/lib/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import UploadFacture from '@/components/UploadFacture'

const CATEGORIES = [
  { value: '', label: 'Toutes catégories' },
  { value: 'loyer', label: 'Loyer' },
  { value: 'internet', label: 'Internet' },
  { value: 'tv', label: 'TV' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'electricite', label: 'Électricité' },
  { value: 'eau', label: 'Eau' },
  { value: 'assurance', label: 'Assurance' },
  { value: 'transport', label: 'Transport' },
  { value: 'sante', label: 'Santé' },
  { value: 'alimentation', label: 'Alimentation' },
  { value: 'loisirs', label: 'Loisirs' },
  { value: 'autre', label: 'Autre' },
]

function chf(n: number) {
  return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(n)
}

const emptyForm = {
  emetteur: '', montant: '', dateReception: format(new Date(), 'yyyy-MM-dd'),
  dateEcheance: '', categorie: 'autre', notes: '',
}

export default function FacturesPage() {
  const [factures, setFactures] = useState<Facture[]>([])
  const [loading, setLoading] = useState(true)
  const [filterPaid, setFilterPaid] = useState<'all' | 'paid' | 'pending'>('all')
  const [filterCat, setFilterCat] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/factures')
      const data = await res.json()
      setFactures(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = factures
    .filter(f => filterPaid === 'all' || (filterPaid === 'paid' ? f.payee : !f.payee))
    .filter(f => !filterCat || f.categorie === filterCat)

  async function togglePaid(f: Facture) {
    await fetch('/api/factures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'marquer-payee', id: f.id, payee: !f.payee }),
    })
    setFactures(prev => prev.map(x => x.id === f.id ? { ...x, payee: !x.payee } : x))
  }

  async function deleteFacture(id: string) {
    if (!confirm('Supprimer cette facture ?')) return
    await fetch('/api/factures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    })
    setFactures(prev => prev.filter(f => f.id !== id))
  }

  function openNew() {
    setEditId(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(f: Facture) {
    setEditId(f.id)
    setForm({
      emetteur: f.emetteur,
      montant: String(f.montant),
      dateReception: f.dateReception,
      dateEcheance: f.dateEcheance || '',
      categorie: f.categorie || 'autre',
      notes: f.notes || '',
    })
    setShowModal(true)
  }

  async function save() {
    if (!form.emetteur || !form.montant) return
    setSaving(true)
    const data = {
      emetteur: form.emetteur,
      montant: parseFloat(form.montant),
      dateReception: form.dateReception,
      dateEcheance: form.dateEcheance || undefined,
      categorie: form.categorie,
      notes: form.notes || undefined,
      payee: false,
    }
    if (editId) {
      await fetch('/api/factures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', id: editId, data }),
      })
    } else {
      await fetch('/api/factures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      })
    }
    setSaving(false)
    setShowModal(false)
    load()
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Factures</h1>
          <p className="text-slate-400 text-sm mt-0.5">{factures.length} facture{factures.length > 1 ? 's' : ''} au total</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            📷 Photo / PDF
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Manuel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex rounded-lg border border-slate-700 overflow-hidden">
          {(['all', 'pending', 'paid'] as const).map(v => (
            <button
              key={v}
              onClick={() => setFilterPaid(v)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${filterPaid === v ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
            >
              {v === 'all' ? 'Toutes' : v === 'pending' ? 'En attente' : 'Payées'}
            </button>
          ))}
        </div>
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
        >
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-slate-500 text-center py-12">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="text-slate-500 text-center py-12">Aucune facture</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(f => (
            <div
              key={f.id}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${f.payee ? 'bg-slate-900/50 border-slate-800 opacity-70' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
            >
              {/* Checkbox */}
              <button
                onClick={() => togglePaid(f)}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${f.payee ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-600 hover:border-violet-500'}`}
              >
                {f.payee && <span className="text-xs">✓</span>}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-medium text-sm ${f.payee ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                    {f.emetteur}
                  </span>
                  {f.categorie && (
                    <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                      {CATEGORIES.find(c => c.value === f.categorie)?.label || f.categorie}
                    </span>
                  )}
                  {f.source === 'gmail' && (
                    <span className="text-xs bg-blue-900/40 text-blue-400 px-2 py-0.5 rounded-full">Gmail</span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Reçu le {format(new Date(f.dateReception), 'dd MMM yyyy', { locale: fr })}
                  {f.dateEcheance && ` · Échéance: ${format(new Date(f.dateEcheance), 'dd MMM yyyy', { locale: fr })}`}
                  {f.datePaiement && ` · Payée le ${format(new Date(f.datePaiement), 'dd MMM yyyy', { locale: fr })}`}
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className={`font-semibold ${f.payee ? 'text-slate-500' : 'text-slate-100'}`}>
                  {chf(f.montant)}
                </div>
              </div>

              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => openEdit(f)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  ✏️
                </button>
                <button
                  onClick={() => deleteFacture(f.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                >
                  🗑
                </button>
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
              {editId ? 'Modifier la facture' : 'Nouvelle facture'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Émetteur *</label>
                <input
                  value={form.emetteur}
                  onChange={e => setForm(p => ({ ...p, emetteur: e.target.value }))}
                  placeholder="SIG, Swisscom, ..."
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
                  <label className="block text-xs text-slate-400 mb-1">Catégorie</label>
                  <select
                    value={form.categorie}
                    onChange={e => setForm(p => ({ ...p, categorie: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                  >
                    {CATEGORIES.filter(c => c.value).map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Date réception</label>
                  <input
                    type="date"
                    value={form.dateReception}
                    onChange={e => setForm(p => ({ ...p, dateReception: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Date échéance</label>
                  <input
                    type="date"
                    value={form.dateEcheance}
                    onChange={e => setForm(p => ({ ...p, dateEcheance: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500 resize-none"
                />
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
                disabled={saving || !form.emetteur || !form.montant}
                className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <UploadFacture
          onClose={() => setShowUpload(false)}
          onSaved={() => { setShowUpload(false); load() }}
        />
      )}
    </div>
  )
}
