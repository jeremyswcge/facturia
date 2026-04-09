import { NextRequest, NextResponse } from 'next/server'
import { listDocs, addDoc, updateDoc, deleteDoc } from '@/lib/firestore-rest'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const mois = searchParams.get('mois')
    const annee = searchParams.get('annee')

    let factures = await listDocs('factures')

    if (mois && annee) {
      const debut = `${annee}-${mois.padStart(2, '0')}-01`
      const fin = `${annee}-${mois.padStart(2, '0')}-31`
      factures = factures.filter(f => f.dateReception >= debut && f.dateReception <= fin)
    }

    factures.sort((a, b) => (b.dateReception || '').localeCompare(a.dateReception || ''))
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
      await updateDoc('factures', id, {
        payee,
        datePaiement: payee ? new Date().toISOString().split('T')[0] : null,
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'update') {
      await updateDoc('factures', id, data)
      return NextResponse.json({ success: true })
    }

    if (action === 'delete') {
      await deleteDoc('factures', id)
      return NextResponse.json({ success: true })
    }

    // Nouvelle facture
    const newId = await addDoc('factures', {
      ...data,
      devise: 'CHF',
      source: data.source || 'manuel',
      createdAt: new Date().toISOString(),
    })
    return NextResponse.json({ id: newId })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
