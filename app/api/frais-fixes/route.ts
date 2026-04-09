import { NextRequest, NextResponse } from 'next/server'
import { getFraisFixes, addFraisFixes, updateFraisFixes, deleteFraisFixes } from '@/lib/firestore'

export async function GET() {
  try {
    const frais = await getFraisFixes()
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
      await updateFraisFixes(id, data)
      return NextResponse.json({ success: true })
    }

    if (action === 'delete') {
      await deleteFraisFixes(id)
      return NextResponse.json({ success: true })
    }

    const newId = await addFraisFixes({
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
