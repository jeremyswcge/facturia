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

async function analyzePdf(pdfText: string) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `${PROMPT}\n\nContenu du document :\n${pdfText.substring(0, 8000)}`,
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const type = formData.get('type') as string // 'images' | 'pdf'

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

      const buffer = Buffer.from(await file.arrayBuffer())
      const pdfParseModule = await import('pdf-parse')
      const pdfParse = (pdfParseModule as any).default ?? pdfParseModule
      const parsed = await pdfParse(buffer)
      result = await analyzePdf(parsed.text)

    } else {
      return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
    }

    return NextResponse.json({ result })
  } catch (error: any) {
    console.error('Upload facture error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
