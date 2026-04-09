import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { getAuthInstance } from './firebase'

// ─── Emails autorisés ─────────────────────────────────────────────────────────
// Ajouter ici les adresses Gmail qui peuvent accéder à Facturia
export const AUTHORIZED_EMAILS = [
  'jeremyswcge@gmail.com',
  // Ajouter l'email de Mélina ici si nécessaire
]

export function isAuthorized(email: string | null): boolean {
  if (!email) return false
  return AUTHORIZED_EMAILS.includes(email.toLowerCase())
}

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const result = await signInWithPopup(getAuthInstance(), provider)
  if (!isAuthorized(result.user.email)) {
    await signOut(getAuthInstance())
    throw new Error('Accès refusé. Ce compte Google n\'est pas autorisé.')
  }
  return result.user
}

export async function logout(): Promise<void> {
  await signOut(getAuthInstance())
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(getAuthInstance(), callback)
}
