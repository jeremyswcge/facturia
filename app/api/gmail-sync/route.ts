import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import Anthropic from '@anthropic-ai/sdk'
import { addFacture } from '@/lib/firestore'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function getGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  )
  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  })
  return google.gmail({ version: 'v1', auth: oauth2Client })
}

async function analyzeWithClaude(content: string, subject: string): Promise<{
  emetteur: string
  montant: number
  dateEcheance?: string
  categorie?: string
} | null> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Analyse ce courriel/facture et extrait les informations suivantes en JSON:
- emetteur: nom de l'émetteur/entreprise
- montant: montant en CHF (nombre décimal uniquement, sans symbole)
- dateEcheance: date d'échéance au format YYYY-MM-DD (si présente)
- categorie: une parmi [loyer, internet, tv, mobile, electricite, eau, assurance, transport, sante, alimentation, loisirs, autre]

Sujet: ${subject}

Contenu:
${content.substring(0, 3000)}

Réponds UNIQUEMENT avec le JSON, rien d'autre. Si aucun montant n'est trouvé, retourne null.`,
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    if (cleaned === 'null') return null
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}

function decodeBase64(str: string): string {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
}

function extractBody(payload: any): string {
  if (!payload) return ''
  if (payload.body?.data) return decodeBase64(payload.body.data)
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64(part.body.data)
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        const html = decodeBase64(part.body.data)
        return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      }
    }
  }
  return ''
}

export async function POST() {
  try {
    const gmail = getGmailClient()
    const labelName = process.env.GMAIL_LABEL || 'Factures'

    // Find label ID
    const labelsRes = await gmail.users.labels.list({ userId: 'me' })
    const label = labelsRes.data.labels?.find(l => l.name === labelName)
    if (!label?.id) {
      return NextResponse.json({ error: `Label "${labelName}" introuvable` }, { status: 404 })
    }

    // Get unread messages in label
    const messagesRes = await gmail.users.messages.list({
      userId: 'me',
      labelIds: [label.id],
      q: 'is:unread',
      maxResults: 20,
    })

    const messages = messagesRes.data.messages || []
    const results: { id: string; status: string }[] = []

    for (const msg of messages) {
      if (!msg.id) continue
      try {
        const fullMsg = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full',
        })

        const headers = fullMsg.data.payload?.headers || []
        const subject = headers.find(h => h.name === 'Subject')?.value || '(Sans sujet)'
        const dateHeader = headers.find(h => h.name === 'Date')?.value
        const dateReception = dateHeader
          ? new Date(dateHeader).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]

        const body = extractBody(fullMsg.data.payload)
        const analysis = await analyzeWithClaude(body, subject)

        if (analysis && analysis.montant > 0) {
          await addFacture({
            emetteur: analysis.emetteur,
            montant: analysis.montant,
            devise: 'CHF',
            dateReception,
            dateEcheance: analysis.dateEcheance,
            payee: false,
            source: 'gmail',
            gmailMessageId: msg.id,
            categorie: analysis.categorie,
            createdAt: new Date().toISOString(),
          })

          // Mark as read
          await gmail.users.messages.modify({
            userId: 'me',
            id: msg.id,
            requestBody: { removeLabelIds: ['UNREAD'] },
          })

          results.push({ id: msg.id, status: 'imported' })
        } else {
          results.push({ id: msg.id, status: 'skipped (no amount)' })
        }
      } catch (err) {
        results.push({ id: msg.id!, status: 'error' })
      }
    }

    return NextResponse.json({ synced: results.length, results })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Use POST to trigger Gmail sync' })
}
