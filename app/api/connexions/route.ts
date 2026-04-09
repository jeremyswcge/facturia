import { NextRequest, NextResponse } from 'next/server'
import { listDocs, addDoc } from '@/lib/firestore-rest'

export async function GET() {
  try {
    const connexions = await listDocs('connexions')
    connexions.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
    return NextResponse.json(connexions)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, displayName, photoURL } = body
    if (!email) return NextResponse.json({ error: 'email requis' }, { status: 400 })

    await addDoc('connexions', {
      email,
      displayName: displayName || '',
      photoURL: photoURL || '',
      timestamp: new Date().toISOString(),
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
