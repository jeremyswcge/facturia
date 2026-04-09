'use client'

import { useRef, useState } from 'react'
import { format } from 'date-fns'

interface AnalysisResult {
  emetteur: string
  montant: number
  devise: string
  dateEcheance: string | null
  dateFacture: string | null
  numeroFacture: string | null
  categorie: string
  description: string
}

interface Props {
  onSaved: () => void
  onClose: () => void
}

type Step = 'select' | 'preview' | 'analyzing' | 'confirm' | 'error'

const CATEGORIES_LABELS: Record<string, string> = {
  loyer: 'Loyer', internet: 'Internet', tv: 'TV', mobile: 'Mobile',
  electricite: 'Électricité', eau: 'Eau', assurance: 'Assurance',
  transport: 'Transport', sante: 'Santé', alimentation: 'Alimentation',
  loisirs: 'Loisirs', autre: 'Autre',
}

export default function UploadFacture({ onSaved, onClose }: Props) {
  const [step, setStep] = useState<Step>('select')
  const [images, setImages] = useState<{ url: string; file: File }[]>([])
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)

  const [emetteur, setEmetteur] = useState('')
  const [montant, setMontant] = useState('')
  const [dateReception, setDateReception] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [dateEcheance, setDateEcheance] = useState('')
  const [categorie, setCategorie] = useState('autre')
  const [notes, setNotes] = useState('')

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const addPageRef = useRef<HTMLInputElement>(null)

  function handleImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setImages(prev => [...prev, ...files.map(f => ({ url: URL.createObjectURL(f), file: f }))])
    setStep('preview')
    e.target.value = ''
  }

  function handlePdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPdfFile(file)
    setStep('preview')
  }

  function removeImage(idx: number) {
    setImages(prev => {
      URL.revokeObjectURL(prev[idx].url)
      const next = prev.filter((_, i) => i !== idx)
      if (next.length === 0) setStep('select')
      return next
    })
  }

  function reset() {
    images.forEach(img => URL.revokeObjectURL(img.url))
    setImages([])
    setPdfFile(null)
    setResult(null)
    setErrorMsg('')
    setSaving(false)
    setStep('select')
  }

  async function analyze() {
    setStep('analyzing')
    try {
      const fd = new FormData()
      if (pdfFile) {
        fd.append('type', 'pdf')
        fd.append('pdf', pdfFile)
      } else {
        fd.append('type', 'images')
        images.forEach(img => fd.append('images', img.file))
      }
      const res = await fetch('/api/upload-facture', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Erreur analyse')
      const r: AnalysisResult = data.result
      setResult(r)
      setEmetteur(r.emetteur || '')
      setMontant(r.montant ? String(r.montant) : '')
      setDateReception(r.dateFacture || format(new Date(), 'yyyy-MM-dd'))
      setDateEcheance(r.dateEcheance || '')
      setCategorie(r.categorie || 'autre')
      setNotes(r.description || '')
      setStep('confirm')
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de l\'analyse')
      setStep('error')
    }
  }

  async function handleSave() {
    if (!emetteur || !montant || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/factures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            emetteur,
            montant: parseFloat(montant),
            dateReception,
            dateEcheance: dateEcheance || undefined,
            categorie,
            notes: notes || undefined,
            payee: false,
          },
        }),
      })
      if (!res.ok) throw new Error('Erreur enregistrement')
      onSaved()
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message)
      setSaving(false)
    }
  }

  // ─── Lightbox ───────────────────────────────────────────────────────────────
  if (lightbox) {
    return (
      <div
        className="fixed inset-0 z-[60] bg-black flex flex-col"
        onClick={() => setLightbox(null)}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span className="text-slate-400 text-sm">Aperçu</span>
          <button className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 text-slate-300 text-xl">✕</button>
        </div>
        <div className="flex-1 flex items-center justify-center p-2 overflow-hidden">
          <img
            src={lightbox}
            alt="Facture"
            className="max-w-full max-h-full object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      </div>
    )
  }

  // ─── Titre par étape ────────────────────────────────────────────────────────
  const titles: Record<Step, string> = {
    select: 'Ajouter une facture',
    preview: 'Vérifier',
    analyzing: 'Analyse en cours',
    confirm: 'Confirmer les données',
    error: 'Erreur',
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />

      {/* Sheet — plein écran mobile, carte desktop */}
      <div className="fixed inset-x-0 bottom-0 md:inset-0 z-50 flex md:items-center md:justify-center md:p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full md:max-w-lg bg-slate-900 md:rounded-2xl border-t md:border border-slate-700 shadow-2xl flex flex-col"
          style={{ height: 'calc(100dvh - 72px)', maxHeight: '100dvh' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
            <div className="flex items-center gap-3">
              {step !== 'select' && step !== 'analyzing' && (
                <button
                  onClick={step === 'confirm' || step === 'error' ? reset : reset}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  ←
                </button>
              )}
              <h2 className="font-bold text-base text-slate-100">{titles[step]}</h2>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors text-lg"
            >
              ✕
            </button>
          </div>

          {/* Body scrollable */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">

            {/* ── SELECT ── */}
            {step === 'select' && (
              <div className="space-y-3">
                <p className="text-slate-400 text-sm mb-5">Choisissez comment importer votre facture</p>
                {[
                  { ref: cameraInputRef, icon: '📷', label: 'Prendre en photo', sub: 'Caméra — plusieurs pages possibles', color: 'violet', capture: true },
                  { ref: galleryInputRef, icon: '🖼️', label: 'Depuis la galerie', sub: 'Sélectionner une ou plusieurs images', color: 'cyan', capture: false },
                  { ref: pdfInputRef, icon: '📄', label: 'Uploader un PDF', sub: 'Document PDF depuis vos fichiers', color: 'emerald', capture: false, pdf: true },
                ].map(btn => (
                  <button
                    key={btn.label}
                    onClick={() => btn.ref.current?.click()}
                    className={`w-full flex items-center gap-4 bg-slate-800 active:bg-slate-700 border border-slate-700 active:border-${btn.color}-600 rounded-2xl p-4 text-left transition-all`}
                  >
                    <div className={`w-14 h-14 rounded-xl bg-${btn.color}-600/20 flex items-center justify-center text-3xl flex-shrink-0`}>
                      {btn.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200 text-base">{btn.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{btn.sub}</div>
                    </div>
                    <span className="ml-auto text-slate-600 text-lg">›</span>
                  </button>
                ))}
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" multiple onChange={handleImages} className="hidden" />
                <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={handleImages} className="hidden" />
                <input ref={pdfInputRef} type="file" accept="application/pdf" onChange={handlePdf} className="hidden" />
              </div>
            )}

            {/* ── PREVIEW ── */}
            {step === 'preview' && (
              <div className="space-y-4">
                {pdfFile && (
                  <div className="flex items-center gap-3 bg-slate-800 rounded-2xl p-4 border border-emerald-800/50">
                    <div className="w-14 h-14 bg-emerald-900/40 rounded-xl flex items-center justify-center text-3xl flex-shrink-0">📄</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-200 truncate">{pdfFile.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{(pdfFile.size / 1024).toFixed(0)} KB · PDF</div>
                    </div>
                    <button onClick={reset} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 text-red-400 flex-shrink-0">✕</button>
                  </div>
                )}

                {images.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-slate-300">{images.length} page{images.length > 1 ? 's' : ''}</span>
                      <button
                        onClick={() => addPageRef.current?.click()}
                        className="text-sm text-violet-400 active:text-violet-300 flex items-center gap-1"
                      >
                        + Ajouter une page
                      </button>
                      <input ref={addPageRef} type="file" accept="image/*" multiple onChange={handleImages} className="hidden" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {images.map((img, i) => (
                        <div key={i} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-slate-800">
                          <img
                            src={img.url}
                            alt={`Page ${i + 1}`}
                            className="w-full h-full object-cover"
                            onClick={() => setLightbox(img.url)}
                          />
                          <div className="absolute top-1 right-1">
                            <button
                              onClick={() => removeImage(i)}
                              className="w-6 h-6 bg-red-600/90 rounded-full flex items-center justify-center text-white text-xs"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-full">
                            {i + 1}
                          </div>
                          <div className="absolute inset-0 flex items-end justify-center pb-6 opacity-0 hover:opacity-100 active:opacity-100 transition-opacity">
                            <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-full">Agrandir 🔍</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={analyze}
                  className="w-full bg-violet-600 active:bg-violet-700 text-white py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 transition-colors mt-2"
                >
                  ✨ Analyser avec l'IA
                </button>
              </div>
            )}

            {/* ── ANALYZING ── */}
            {step === 'analyzing' && (
              <div className="flex flex-col items-center justify-center py-16 gap-5">
                <div className="w-20 h-20 rounded-2xl bg-violet-600/20 flex items-center justify-center text-4xl animate-pulse">🤖</div>
                <div className="text-center">
                  <div className="font-semibold text-slate-200 text-lg">Analyse en cours...</div>
                  <div className="text-sm text-slate-500 mt-1">L'IA extrait les informations</div>
                </div>
                <div className="flex gap-2 mt-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}

            {/* ── CONFIRM ── */}
            {step === 'confirm' && (
              <div className="space-y-4 pb-2">
                <div className="flex items-start gap-2 bg-emerald-900/30 border border-emerald-700/50 rounded-xl px-4 py-3">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  <span className="text-sm text-emerald-300">Analyse terminée — vérifiez et corrigez si nécessaire</span>
                </div>

                {/* Miniatures avec bouton voir */}
                {images.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setLightbox(img.url)}
                        className="flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden bg-slate-800 border border-slate-700 relative"
                      >
                        <img src={img.url} alt={`p${i + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <span className="text-white text-xs">🔍</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {pdfFile && (
                  <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-800 rounded-xl px-3 py-2">
                    <span>📄</span>
                    <span className="truncate">{pdfFile.name}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Émetteur *</label>
                  <input
                    value={emetteur}
                    onChange={e => setEmetteur(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Montant CHF *</label>
                    <input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={montant}
                      onChange={e => setMontant(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Catégorie</label>
                    <select
                      value={categorie}
                      onChange={e => setCategorie(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                    >
                      {Object.entries(CATEGORIES_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Date facture</label>
                    <input
                      type="date"
                      value={dateReception}
                      onChange={e => setDateReception(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Échéance</label>
                    <input
                      type="date"
                      value={dateEcheance}
                      onChange={e => setDateEcheance(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Notes</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-violet-500 resize-none"
                  />
                </div>

                {result?.numeroFacture && (
                  <p className="text-xs text-slate-500">N° facture : {result.numeroFacture}</p>
                )}

                {errorMsg && (
                  <p className="text-xs text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{errorMsg}</p>
                )}
              </div>
            )}

            {/* ── ERROR ── */}
            {step === 'error' && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="text-5xl">⚠️</div>
                <div className="text-center">
                  <div className="font-semibold text-slate-200 text-lg">Analyse échouée</div>
                  <div className="text-sm text-slate-500 mt-1 px-4">{errorMsg}</div>
                </div>
                <button onClick={reset} className="bg-slate-800 active:bg-slate-700 text-slate-200 px-6 py-3 rounded-xl font-medium mt-2 transition-colors">
                  Réessayer
                </button>
              </div>
            )}
          </div>

          {/* Footer — bouton enregistrer */}
          {step === 'confirm' && (
            <div className="flex-shrink-0 px-5 pb-5 pt-3 border-t border-slate-800">
              <button
                onClick={handleSave}
                disabled={saving || !emetteur || !montant}
                className="w-full bg-violet-600 active:bg-violet-700 disabled:opacity-50 text-white py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 transition-colors"
              >
                {saving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enregistrement...
                  </>
                ) : '✓ Enregistrer la facture'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
