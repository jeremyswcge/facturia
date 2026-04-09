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
  onConfirm: (data: {
    emetteur: string
    montant: number
    dateReception: string
    dateEcheance?: string
    categorie: string
    notes?: string
  }) => Promise<void>
  onClose: () => void
}

type Step = 'select' | 'preview' | 'analyzing' | 'confirm' | 'error'

const CATEGORIES_LABELS: Record<string, string> = {
  loyer: 'Loyer', internet: 'Internet', tv: 'TV', mobile: 'Mobile',
  electricite: 'Électricité', eau: 'Eau', assurance: 'Assurance',
  transport: 'Transport', sante: 'Santé', alimentation: 'Alimentation',
  loisirs: 'Loisirs', autre: 'Autre',
}

export default function UploadFacture({ onConfirm, onClose }: Props) {
  const [step, setStep] = useState<Step>('select')
  const [images, setImages] = useState<{ url: string; file: File }[]>([])
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [saving, setSaving] = useState(false)

  // Editable fields after analysis
  const [emetteur, setEmetteur] = useState('')
  const [montant, setMontant] = useState('')
  const [dateReception, setDateReception] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [dateEcheance, setDateEcheance] = useState('')
  const [categorie, setCategorie] = useState('autre')
  const [notes, setNotes] = useState('')

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  // ─── Photo via caméra ou galerie ────────────────────────────────────────────

  function handleCameraCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const newImages = files.map(f => ({ url: URL.createObjectURL(f), file: f }))
    setImages(prev => [...prev, ...newImages])
    setStep('preview')
    // Reset input for next capture
    e.target.value = ''
  }

  function removeImage(idx: number) {
    setImages(prev => {
      URL.revokeObjectURL(prev[idx].url)
      return prev.filter((_, i) => i !== idx)
    })
    if (images.length <= 1) setStep('select')
  }

  // ─── PDF ────────────────────────────────────────────────────────────────────

  function handlePdfSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPdfFile(file)
    setStep('preview')
  }

  // ─── Analyse ────────────────────────────────────────────────────────────────

  async function analyze() {
    setStep('analyzing')
    try {
      const formData = new FormData()

      if (pdfFile) {
        formData.append('type', 'pdf')
        formData.append('pdf', pdfFile)
      } else {
        formData.append('type', 'images')
        images.forEach(img => formData.append('images', img.file))
      }

      const res = await fetch('/api/upload-facture', { method: 'POST', body: formData })
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

  async function handleConfirm() {
    if (!emetteur || !montant) return
    setSaving(true)
    await onConfirm({
      emetteur,
      montant: parseFloat(montant),
      dateReception,
      dateEcheance: dateEcheance || undefined,
      categorie,
      notes: notes || undefined,
    })
    setSaving(false)
  }

  function reset() {
    images.forEach(img => URL.revokeObjectURL(img.url))
    setImages([])
    setPdfFile(null)
    setResult(null)
    setErrorMsg('')
    setStep('select')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col my-auto" style={{ maxHeight: 'calc(100dvh - 2rem)' }}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="font-bold text-lg text-slate-100">Ajouter une facture</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xl leading-none">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">

          {/* ── STEP: SELECT ── */}
          {step === 'select' && (
            <div className="space-y-3">
              <p className="text-slate-400 text-sm mb-4">Choisissez comment importer votre facture</p>

              {/* Camera */}
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full flex items-center gap-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-violet-600 rounded-xl p-4 text-left transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-violet-600/20 flex items-center justify-center text-2xl group-hover:bg-violet-600/30 transition-colors">
                  📷
                </div>
                <div>
                  <div className="font-medium text-slate-200">Prendre en photo</div>
                  <div className="text-xs text-slate-500">Plusieurs photos si facture multi-pages</div>
                </div>
              </button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handleCameraCapture}
                className="hidden"
              />

              {/* Gallery */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-600 rounded-xl p-4 text-left transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-cyan-600/20 flex items-center justify-center text-2xl group-hover:bg-cyan-600/30 transition-colors">
                  🖼️
                </div>
                <div>
                  <div className="font-medium text-slate-200">Depuis la galerie</div>
                  <div className="text-xs text-slate-500">Sélectionner une ou plusieurs images</div>
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleCameraCapture}
                className="hidden"
              />

              {/* PDF */}
              <button
                onClick={() => pdfInputRef.current?.click()}
                className="w-full flex items-center gap-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-600 rounded-xl p-4 text-left transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-600/20 flex items-center justify-center text-2xl group-hover:bg-emerald-600/30 transition-colors">
                  📄
                </div>
                <div>
                  <div className="font-medium text-slate-200">Uploader un PDF</div>
                  <div className="text-xs text-slate-500">Facture PDF depuis vos documents</div>
                </div>
              </button>
              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf"
                onChange={handlePdfSelect}
                className="hidden"
              />
            </div>
          )}

          {/* ── STEP: PREVIEW ── */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* PDF preview */}
              {pdfFile && (
                <div className="flex items-center gap-3 bg-slate-800 rounded-xl p-4 border border-emerald-800/50">
                  <span className="text-3xl">📄</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-200 truncate">{pdfFile.name}</div>
                    <div className="text-xs text-slate-500">{(pdfFile.size / 1024).toFixed(0)} KB</div>
                  </div>
                  <button onClick={reset} className="text-red-400 hover:text-red-300 text-sm">✕</button>
                </div>
              )}

              {/* Images preview */}
              {images.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">{images.length} page{images.length > 1 ? 's' : ''}</span>
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="text-xs text-violet-400 hover:text-violet-300"
                    >
                      + Ajouter une page
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((img, i) => (
                      <div key={i} className="relative aspect-[3/4] rounded-lg overflow-hidden bg-slate-800 group">
                        <img src={img.url} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            onClick={() => removeImage(i)}
                            className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white text-sm hover:bg-red-500"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                          {i + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={analyze}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
              >
                ✨ Analyser avec l'IA
              </button>
              <button onClick={reset} className="w-full text-slate-500 hover:text-slate-300 text-sm py-2 transition-colors">
                Recommencer
              </button>
            </div>
          )}

          {/* ── STEP: ANALYZING ── */}
          {step === 'analyzing' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-violet-600/20 flex items-center justify-center text-3xl animate-pulse">
                🤖
              </div>
              <div className="text-center">
                <div className="font-medium text-slate-200">Analyse en cours...</div>
                <div className="text-sm text-slate-500 mt-1">L'IA extrait les informations de votre facture</div>
              </div>
              <div className="flex gap-1 mt-2">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-violet-500 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── STEP: CONFIRM ── */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-emerald-900/30 border border-emerald-700/50 rounded-xl px-4 py-3">
                <span className="text-emerald-400">✓</span>
                <span className="text-sm text-emerald-300">Analyse terminée — vérifiez et corrigez si nécessaire</span>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Émetteur</label>
                <input
                  value={emetteur}
                  onChange={e => setEmetteur(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Montant CHF</label>
                  <input
                    type="number"
                    step="0.01"
                    value={montant}
                    onChange={e => setMontant(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Catégorie</label>
                  <select
                    value={categorie}
                    onChange={e => setCategorie(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                  >
                    {Object.entries(CATEGORIES_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Date facture</label>
                  <input
                    type="date"
                    value={dateReception}
                    onChange={e => setDateReception(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Échéance</label>
                  <input
                    type="date"
                    value={dateEcheance}
                    onChange={e => setDateEcheance(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>

              {result?.numeroFacture && (
                <p className="text-xs text-slate-500">N° facture détecté : {result.numeroFacture}</p>
              )}
            </div>
          )}

          {/* ── STEP: ERROR ── */}
          {step === 'error' && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <div className="text-4xl">⚠️</div>
              <div className="text-center">
                <div className="font-medium text-slate-200">Analyse échouée</div>
                <div className="text-sm text-slate-500 mt-1">{errorMsg}</div>
              </div>
              <button onClick={reset} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-5 py-2 rounded-lg text-sm transition-colors">
                Réessayer
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'confirm' && (
          <div className="flex gap-3 p-5 border-t border-slate-800">
            <button
              onClick={reset}
              className="flex-1 border border-slate-700 text-slate-400 hover:text-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              Recommencer
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving || !emetteur || !montant}
              className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {saving ? 'Enregistrement...' : '✓ Enregistrer'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
