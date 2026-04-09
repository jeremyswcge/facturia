import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getAuth, type Auth } from 'firebase/auth'

let app: FirebaseApp
let _db: Firestore
let _auth: Auth

function getApp(): FirebaseApp {
  if (!app) {
    const config = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    }
    app = getApps().length === 0 ? initializeApp(config) : getApps()[0]
  }
  return app
}

export function getDb(): Firestore {
  if (!_db) _db = getFirestore(getApp())
  return _db
}

export function getAuthInstance(): Auth {
  if (!_auth) _auth = getAuth(getApp())
  return _auth
}

export { getApp }
