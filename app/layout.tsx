import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Nav from '@/components/Nav'
import { AuthProvider } from '@/components/AuthProvider'
import AuthGuard from '@/components/AuthGuard'
import PWARegister from '@/components/PWARegister'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Facturia',
  description: 'Gestion intelligente de vos factures',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Facturia',
  },
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${inter.className} bg-slate-950 text-slate-100 min-h-screen`}>
        <PWARegister />
        <AuthProvider>
          <AuthGuard>
            <Nav />
            <main className="pt-4 md:pt-28 pb-24 md:pb-6 min-h-screen">{children}</main>
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  )
}
