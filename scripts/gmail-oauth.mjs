/**
 * Script pour obtenir le Gmail Refresh Token
 * Usage: node scripts/gmail-oauth.mjs
 */

import { createServer } from 'http'
import { google } from 'googleapis'
import readline from 'readline'

// ─── Lire les variables depuis .env.local ─────────────────────────────────────
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env.local')
const env = {}
try {
  readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=')
    if (k && !k.startsWith('#')) env[k.trim()] = v.join('=').trim()
  })
} catch {}

const CLIENT_ID = env.GMAIL_CLIENT_ID || process.env.GMAIL_CLIENT_ID
const CLIENT_SECRET = env.GMAIL_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET
const REDIRECT_URI = 'http://localhost:3333/callback'

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n❌ GMAIL_CLIENT_ID et GMAIL_CLIENT_SECRET doivent être dans .env.local\n')
  process.exit(1)
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/gmail.modify'],
  prompt: 'consent',
})

console.log('\n🔑 Facturia — Gmail OAuth Setup\n')
console.log('1. Ouvre cette URL dans ton navigateur:\n')
console.log('   ' + authUrl)
console.log('\n2. Connecte-toi avec jeremyswcge@gmail.com')
console.log('3. Autorise l\'accès Gmail')
console.log('4. Tu seras redirigé automatiquement...\n')

// Serveur local pour capturer le callback
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:3333')
  const code = url.searchParams.get('code')

  if (!code) {
    res.end('Pas de code reçu.')
    return
  }

  try {
    const { tokens } = await oauth2Client.getToken(code)

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(`
      <html><body style="font-family:sans-serif;padding:40px;background:#0f172a;color:#f1f5f9">
        <h2 style="color:#8b5cf6">✅ Refresh Token obtenu !</h2>
        <p>Copie cette valeur dans ton <code>.env.local</code> et dans Vercel :</p>
        <pre style="background:#1e293b;padding:20px;border-radius:8px;word-break:break-all;color:#10b981">${tokens.refresh_token}</pre>
        <p style="color:#94a3b8">Variable: <strong>GMAIL_REFRESH_TOKEN</strong></p>
        <p style="color:#64748b">Tu peux fermer cette fenêtre.</p>
      </body></html>
    `)

    console.log('\n✅ REFRESH TOKEN OBTENU:\n')
    console.log('GMAIL_REFRESH_TOKEN=' + tokens.refresh_token)
    console.log('\nAjoute cette ligne dans .env.local et dans les env vars Vercel.\n')

    server.close()
  } catch (err) {
    res.end('Erreur: ' + err.message)
    console.error('Erreur:', err.message)
    server.close()
  }
})

server.listen(3333, () => {
  console.log('⏳ En attente du callback sur http://localhost:3333/callback ...\n')
})
