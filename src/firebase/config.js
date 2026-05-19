import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAe_76qw1v7iqKZe0ZwjVw-dfrgOwHTbUc",
  authDomain: "world-cup-journey.firebaseapp.com",
  projectId: "world-cup-journey",
  storageBucket: "world-cup-journey.firebasestorage.app",
  messagingSenderId: "90851977092",
  appId: "1:90851977092:web:79613c8afc886cd23f9fd1"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()
