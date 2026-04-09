import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PROMPT = `Tu es un assistant spécialisé dans l'analyse de factures suisses.
Analyse ce document et extrait exactement ces informations en JSON :
{
  "emetteur": "nom de l'entreprise/expéditeur",
  "montant": 123.45,
  "devise": "CHF",
  "dateEcheance": "YYYY-MM-DD",
  "dateFacture": "YYYY-MM-DD",
  "numeroFacture": "numéro de facture si présent",
  "categorie": "loyer|internet|tv|mobile|electricite|eau|assurance|transport|sante|alimentation|loisirs|autre",
  "description": "brève description du contenu"
}

Règles :
- montant : nombre décimal uniquement (ex: 129.90), sans symbole monétaire
- Si pas de date d'échéance trouvée, mettre null
- Si pas de date de facture, mettre null
- devise : toujours "CHF" sauf si clairement indiqué autrement
- Réponds UNIQUEMENT avec le JSON, rien d'autre`

async function analyzeImages(images: { data: string; mediaType: string }[]) {
  const content: Anthropic.MessageParam['content'] = [
    ...images.map(img => ({
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: img.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
        data: img.data,
      },
    })),
    { type: 'text' as const, text: PROMPT },
  ]

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
}

async function analyzePdfNative(base64: string) {
  // Claude supporte nativement les PDF via le type "document"
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document' as const,
            source: {
              type: 'base64' as const,
              media_type: 'application/pdf',
              data: base64,
            },
          } as any,
          { type: 'text' as const, text: PROMPT },
        ],
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const type = formData.get('type') as string

    let result: any = null

    if (type === 'images') {
      const files = formData.getAll('images') as File[]
      if (files.length === 0) return NextResponse.json({ error: 'Aucune image fournie' }, { status: 400 })

      const images = await Promise.all(
        files.map(async file => {
          const buffer = await file.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')
          return { data: base64, mediaType: file.type || 'image/jpeg' }
        })
      )

      result = await analyzeImages(images)

    } else if (type === 'pdf') {
      const file = formData.get('pdf') as File
      if (!file) return NextResponse.json({ error: 'Aucun PDF fourni' }, { status: 400 })

      const buffer = await file.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      result = await analyzePdfNative(base64)

    } else {
      return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
    }

    return NextResponse.json({ result })
  } catch (error: any) {
    console.error('Upload facture error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
