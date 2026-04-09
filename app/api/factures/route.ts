import { NextRequest, NextResponse } from 'next/server'
import { getFactures, addFacture, updateFacture, deleteFacture, marquerPayee } from '@/lib/firestore'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const mois = searchParams.get('mois') || undefined
    const annee = searchParams.get('annee') ? parseInt(searchParams.get('annee')!) : undefined
    const factures = await getFactures(mois, annee)
    return NextResponse.json(factures)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, id, data, payee } = body

    if (action === 'marquer-payee') {
      await marquerPayee(id, payee)
      return NextResponse.json({ success: true })
    }

    if (action === 'update') {
      await updateFacture(id, data)
      return NextResponse.json({ success: true })
    }

    if (action === 'delete') {
      await deleteFacture(id)
      return NextResponse.json({ success: true })
    }

    // Add new facture
    const newId = await addFacture({
      ...data,
      devise: 'CHF',
      source: 'manuel',
      createdAt: new Date().toISOString(),
    })
    return NextResponse.json({ id: newId })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
