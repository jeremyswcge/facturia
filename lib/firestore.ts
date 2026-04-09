import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { getDb } from './firebase'
import type { Facture, FraisFixes, Salaire } from './types'

// ─── Factures ────────────────────────────────────────────────────────────────

export async function getFactures(mois?: string, annee?: number): Promise<Facture[]> {
  const db = getDb()
  let q = query(collection(db, 'factures'), orderBy('dateReception', 'desc'))
  if (mois && annee) {
    const debut = `${annee}-${mois.padStart(2, '0')}-01`
    const fin = `${annee}-${mois.padStart(2, '0')}-31`
    q = query(
      collection(db, 'factures'),
      where('dateReception', '>=', debut),
      where('dateReception', '<=', fin),
      orderBy('dateReception', 'desc')
    )
  }
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Facture))
}

export async function addFacture(facture: Omit<Facture, 'id'>): Promise<string> {
  const ref = await addDoc(collection(getDb(), 'factures'), facture)
  return ref.id
}

export async function updateFacture(id: string, data: Partial<Facture>): Promise<void> {
  await updateDoc(doc(getDb(), 'factures', id), data)
}

export async function deleteFacture(id: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'factures', id))
}

export async function marquerPayee(id: string, payee: boolean): Promise<void> {
  await updateDoc(doc(getDb(), 'factures', id), {
    payee,
    datePaiement: payee ? new Date().toISOString().split('T')[0] : null,
  })
}

// ─── Frais Fixes ─────────────────────────────────────────────────────────────

export async function getFraisFixes(): Promise<FraisFixes[]> {
  const snap = await getDocs(collection(getDb(), 'frais-fixes'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FraisFixes))
}

export async function addFraisFixes(frais: Omit<FraisFixes, 'id'>): Promise<string> {
  const ref = await addDoc(collection(getDb(), 'frais-fixes'), frais)
  return ref.id
}

export async function updateFraisFixes(id: string, data: Partial<FraisFixes>): Promise<void> {
  await updateDoc(doc(getDb(), 'frais-fixes', id), data)
}

export async function deleteFraisFixes(id: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'frais-fixes', id))
}

// ─── Salaires ─────────────────────────────────────────────────────────────────

export async function getSalaires(): Promise<Salaire[]> {
  const snap = await getDocs(collection(getDb(), 'salaires'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Salaire))
}

export async function setSalaire(salaire: Omit<Salaire, 'id'> & { id?: string }): Promise<void> {
  if (salaire.id) {
    const { id, ...data } = salaire
    await updateDoc(doc(getDb(), 'salaires', id), data)
  } else {
    await addDoc(collection(getDb(), 'salaires'), salaire)
  }
}
