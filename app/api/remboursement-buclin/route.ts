import { NextRequest, NextResponse } from 'next/server'
import { listDocs, addDoc, deleteDoc } from '@/lib/firestore-rest'

const COL_ITEMS = 'remboursement-buclin-items'
const COL_PAYMENTS = 'remboursement-buclin-paiements'

export async function GET() {
  try {
    const [items, payments] = await Promise.all([
      listDocs(COL_ITEMS),
      listDocs(COL_PAYMENTS),
    ])
    return NextResponse.json({ items, payments })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, type, id, data } = body

    if (action === 'delete') {
      const col = type === 'payment' ? COL_PAYMENTS : COL_ITEMS
      await deleteDoc(col, id)
      return NextResponse.json({ success: true })
    }

    if (type === 'payment') {
      const newId = await addDoc(COL_PAYMENTS, {
        date: data.date,
        amount: data.amount,
        createdAt: new Date().toISOString(),
      })
      return NextResponse.json({ id: newId })
    }

    const newId = await addDoc(COL_ITEMS, {
      description: data.description,
      amount: data.amount,
      createdAt: new Date().toISOString(),
    })
    return NextResponse.json({ id: newId })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
