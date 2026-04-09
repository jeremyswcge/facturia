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
  'bergermelina2@gmail.com',
]

export const ADMIN_EMAILS = [
  'jeremyswcge@gmail.com',
]

export function isAdmin(email: string | null): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}

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
  // Log the connection (fire and forget)
  fetch('/api/connexions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: result.user.email,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL,
    }),
  }).catch(() => {})
  return result.user
}

export async function logout(): Promise<void> {
  await signOut(getAuthInstance())
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(getAuthInstance(), callback)
}
