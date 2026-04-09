/**
 * Firestore via REST API — fonctionne côté serveur sans SDK ni clé Admin
 * Requiert des règles Firestore ouvertes (allow read, write: if true)
 */

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

// ─── Sérialisation ─────────────────────────────────────────────────────────

function toFirestore(obj: Record<string, any>): { fields: Record<string, any> } {
  const fields: Record<string, any> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) {
      fields[k] = { nullValue: null }
    } else if (typeof v === 'boolean') {
      fields[k] = { booleanValue: v }
    } else if (typeof v === 'number') {
      fields[k] = { doubleValue: v }
    } else if (typeof v === 'string') {
      fields[k] = { stringValue: v }
    } else if (typeof v === 'object') {
      fields[k] = { mapValue: toFirestore(v) }
    }
  }
  return { fields }
}

function fromFirestore(fields: Record<string, any>): Record<string, any> {
  const obj: Record<string, any> = {}
  for (const [k, v] of Object.entries(fields)) {
    if ('nullValue' in v) obj[k] = null
    else if ('booleanValue' in v) obj[k] = v.booleanValue
    else if ('doubleValue' in v) obj[k] = v.doubleValue
    else if ('integerValue' in v) obj[k] = parseInt(v.integerValue)
    else if ('stringValue' in v) obj[k] = v.stringValue
    else if ('mapValue' in v) obj[k] = fromFirestore(v.mapValue.fields || {})
    else if ('timestampValue' in v) obj[k] = v.timestampValue
  }
  return obj
}

function docId(name: string) {
  return name.split('/').pop()!
}

// ─── CRUD ──────────────────────────────────────────────────────────────────

export async function listDocs(collection: string): Promise<any[]> {
  const res = await fetch(`${BASE}/${collection}?pageSize=500`)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Firestore list error: ${err}`)
  }
  const data = await res.json()
  if (!data.documents) return []
  return data.documents.map((d: any) => ({
    id: docId(d.name),
    ...fromFirestore(d.fields || {}),
  }))
}

export async function addDoc(collection: string, data: Record<string, any>): Promise<string> {
  const res = await fetch(`${BASE}/${collection}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toFirestore(data)),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Firestore add error: ${err}`)
  }
  const doc = await res.json()
  return docId(doc.name)
}

export async function updateDoc(collection: string, id: string, data: Record<string, any>): Promise<void> {
  const fields = toFirestore(data).fields
  const updateMask = Object.keys(fields).map(k => `updateMask.fieldPaths=${k}`).join('&')
  const res = await fetch(`${BASE}/${collection}/${id}?${updateMask}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Firestore update error: ${err}`)
  }
}

export async function deleteDoc(collection: string, id: string): Promise<void> {
  const res = await fetch(`${BASE}/${collection}/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Firestore delete error: ${err}`)
  }
}
