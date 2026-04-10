'use client'

import { useState, useEffect } from 'react'

type Item = {
  id: string
  description: string
  amount: number
}

type Payment = {
  id: string
  date: string
  amount: number
}

const STORAGE_KEY = 'remboursement-buclin'

function loadData(): { items: Item[]; payments: Payment[] } {
  if (typeof window === 'undefined') return { items: [], payments: [] }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { items: [], payments: [] }
}

function saveData(items: Item[], payments: Payment[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, payments }))
}

function chf(n: number) {
  return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(n)
}

export default function RemboursementBuclinPage() {
  const [items, setItems] = useState<Item[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const data = loadData()
    setItems(data.items)
    setPayments(data.payments)
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (loaded) saveData(items, payments)
  }, [items, payments, loaded])

  const totalDu = items.reduce((s, i) => s + i.amount, 0)
  const totalRembourse = payments.reduce((s, p) => s + p.amount, 0)
  const solde = totalDu - totalRembourse

  function addItem() {
    const a = parseFloat(amount)
    if (!desc.trim() || isNaN(a) || a <= 0) return
    setItems([...items, { id: crypto.randomUUID(), description: desc.trim(), amount: a }])
    setDesc('')
    setAmount('')
  }

  function removeItem(id: string) {
    setItems(items.filter((i) => i.id !== id))
  }

  function addPayment() {
    const a = parseFloat(payAmount)
    if (isNaN(a) || a <= 0 || !payDate) return
    setPayments([...payments, { id: crypto.randomUUID(), date: payDate, amount: a }])
    setPayAmount('')
  }

  function removePayment(id: string) {
    setPayments(payments.filter((p) => p.id !== id))
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-500">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">💰 Remboursement Buclin</h1>
        <p className="text-sm text-slate-400 mt-1">Suivi des montants dus et des versements effectués.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Montants à rembourser */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-semibold text-slate-200">Montants à rembourser</h2>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Description"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItem()}
              className="flex-[2] bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-violet-500 transition-colors"
            />
            <input
              type="number"
              placeholder="CHF"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItem()}
              step="0.05"
              min="0"
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-violet-500 transition-colors"
            />
            <button
              onClick={addItem}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              Ajouter
            </button>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">Aucun montant enregistré.</p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2.5"
                >
                  <span className="text-sm text-slate-300 flex-1">{item.description}</span>
                  <span className="text-sm font-semibold text-slate-200 ml-3 whitespace-nowrap">
                    {chf(item.amount)}
                  </span>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="ml-2 text-slate-500 hover:text-red-400 transition-colors text-lg leading-none px-1"
                    title="Supprimer"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-slate-700 pt-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-300">Total dû</span>
            <span className="text-lg font-bold text-violet-400">{chf(totalDu)}</span>
          </div>
        </div>

        {/* Versements effectués */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-semibold text-slate-200">Versements effectués</h2>

          <div className="flex gap-2">
            <input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500 transition-colors"
            />
            <input
              type="number"
              placeholder="CHF"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPayment()}
              step="0.05"
              min="0"
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500 transition-colors"
            />
            <button
              onClick={addPayment}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              Ajouter
            </button>
          </div>

          {payments.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">Aucun versement enregistré.</p>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2.5"
                >
                  <span className="text-sm text-slate-400">
                    {new Date(p.date + 'T00:00:00').toLocaleDateString('fr-CH', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="text-sm font-semibold text-emerald-400 ml-3 whitespace-nowrap">
                    {chf(p.amount)}
                  </span>
                  <button
                    onClick={() => removePayment(p.id)}
                    className="ml-2 text-slate-500 hover:text-red-400 transition-colors text-lg leading-none px-1"
                    title="Supprimer"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-slate-700 pt-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-300">Total remboursé</span>
            <span className="text-lg font-bold text-emerald-400">{chf(totalRembourse)}</span>
          </div>
        </div>
      </div>

      {/* Solde */}
      <div
        className={`rounded-2xl border p-5 flex items-center justify-between ${
          solde <= 0
            ? 'bg-emerald-900/20 border-emerald-800/50'
            : 'bg-red-900/20 border-red-800/50'
        }`}
      >
        <span className="text-base font-semibold text-slate-200">
          {solde <= 0 ? '✅ Tout est remboursé !' : 'Solde restant à rembourser'}
        </span>
        <span className={`text-xl font-bold ${solde <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {chf(Math.abs(solde))}
        </span>
      </div>
    </div>
  )
}
