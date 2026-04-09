import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { content, subject } = await req.json()
    if (!content) return NextResponse.json({ error: 'content requis' }, { status: 400 })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Analyse ce document/facture et extrait les informations en JSON:
- emetteur: nom de l'émetteur/entreprise
- montant: montant en CHF (nombre décimal uniquement)
- dateEcheance: date d'échéance au format YYYY-MM-DD
- categorie: [loyer, internet, tv, mobile, electricite, eau, assurance, transport, sante, alimentation, loisirs, autre]

${subject ? `Sujet: ${subject}\n` : ''}
Contenu:
${content.substring(0, 3000)}

Réponds UNIQUEMENT avec le JSON ou null si pas de facture détectée.`,
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : 'null'
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    if (cleaned === 'null') return NextResponse.json({ result: null })
    return NextResponse.json({ result: JSON.parse(cleaned) })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
