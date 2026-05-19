import { db } from '../firebase/config'
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore'

const API_BASE = '/api/fixtures'

export async function fetchLiveMatches() {
  try {
    const res = await fetch(`${API_BASE}?live=all`)
    const data = await res.json()
    return data.response || []
  } catch (e) {
    console.error('Error fetching live matches:', e)
    return []
  }
}

export async function fetchMatchById(fixtureId) {
  try {
    const res = await fetch(`${API_BASE}?id=${fixtureId}`)
    const data = await res.json()
    return data.response?.[0] || null
  } catch (e) {
    console.error('Error fetching match:', e)
    return null
  }
}

export async function syncLiveMatches() {
  try {
    const q = query(collection(db, 'partidos'), where('estado', '==', 'live'))
    const snap = await getDocs(q)
    if (snap.empty) return
    for (const docSnap of snap.docs) {
      const partido = docSnap.data()
      if (!partido.apiFixtureId) continue
      const match = await fetchMatchById(partido.apiFixtureId)
      if (!match) continue
      const goals = match.goals
      const status = match.fixture.status
      const marcador = `${goals.home ?? 0} - ${goals.away ?? 0}`
      const minuto = status.elapsed || 0
      let nuevoEstado = 'live'
      if (['FT', 'AET', 'PEN'].includes(status.short)) nuevoEstado = 'finalizado'
      await updateDoc(doc(db, 'partidos', docSnap.id), { marcador, minuto, estado: nuevoEstado })
    }
  } catch (e) {
    console.error('Error syncing live matches:', e)
  }
}

export async function syncUpcomingMatches() {
  try {
    const liveMatches = await fetchLiveMatches()
    if (!liveMatches.length) return
    const q = query(collection(db, 'partidos'), where('estado', '==', 'proximo'))
    const snap = await getDocs(q)
    for (const docSnap of snap.docs) {
      const partido = docSnap.data()
      if (!partido.apiFixtureId) continue
      const liveMatch = liveMatches.find(m => m.fixture.id === partido.apiFixtureId)
      if (!liveMatch) continue
      await updateDoc(doc(db, 'partidos', docSnap.id), {
        estado: 'live',
        marcador: `${liveMatch.goals.home ?? 0} - ${liveMatch.goals.away ?? 0}`,
        minuto: liveMatch.fixture.status.elapsed || 0
      })
    }
  } catch (e) {
    console.error('Error syncing upcoming:', e)
  }
}
