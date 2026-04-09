import { NextRequest, NextResponse } from 'next/server'
import { listDocs, addDoc, updateDoc, deleteDoc } from '@/lib/firestore-rest'

export async function GET() {
  try {
    const frais = await listDocs('frais-fixes')
    return NextResponse.json(frais)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, id, data } = body

    if (action === 'update') {
      await updateDoc('frais-fixes', id, data)
      return NextResponse.json({ success: true })
    }

    if (action === 'delete') {
      await deleteDoc('frais-fixes', id)
      return NextResponse.json({ success: true })
    }

    const newId = await addDoc('frais-fixes', {
      ...data,
      devise: 'CHF',
      actif: true,
      createdAt: new Date().toISOString(),
    })
    return NextResponse.json({ id: newId })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
