import { createContext, useContext, useEffect, useState } from 'react'
import { auth, db, googleProvider } from '../firebase/config'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'

const AuthContext = createContext()
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)

  const createUserDoc = async (firebaseUser, username) => {
    const ref = doc(db, 'users', firebaseUser.uid)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        username: username || firebaseUser.displayName || 'jugador',
        saldo: 0,
        puntos: 0,
        aciertos: 0,
        totalApuestas: 0,
        createdAt: serverTimestamp()
      })
    }
    const updated = await getDoc(ref)
    setUserData(updated.data())
  }

  const register = async (email, password, username) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName: username })
    await createUserDoc(cred.user, username)
    return cred
  }

  const login = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password)
  }

  const loginWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider)
    await createUserDoc(cred.user, cred.user.displayName)
    return cred
  }

  const logout = () => signOut(auth)

  const refreshUserData = async () => {
    if (!user) return
    const snap = await getDoc(doc(db, 'users', user.uid))
    if (snap.exists()) setUserData(snap.data())
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
        if (snap.exists()) setUserData(snap.data())
      } else {
        setUserData(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  return (
    <AuthContext.Provider value={{ user, userData, loading, register, login, loginWithGoogle, logout, refreshUserData }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
