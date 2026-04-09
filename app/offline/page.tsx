export const metadata = { title: 'Hors ligne — Facturia' }

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <h1 className="text-2xl font-semibold mb-2">Vous êtes hors ligne</h1>
      <p className="text-slate-400">
        Reconnectez-vous à Internet pour accéder à Facturia. Vos dernières pages consultées restent disponibles.
      </p>
    </div>
  )
}
