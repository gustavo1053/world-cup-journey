import { db } from '../firebase/config'
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore'

const API_KEY = '7899dd7698fa657b0f402b2b7d47851f'
const API_HOST = 'v3.football.api-sports.io'
const BASE_URL = 'https://v3.football.api-sports.io'

const headers = {
  'x-apisports-key': API_KEY,
  'x-apisports-host': API_HOST
}

// Obtener partidos en vivo de la API
export async function fetchLiveMatches() {
  try {
    const res = await fetch(`${BASE_URL}/fixtures?live=all`, { headers })
    const data = await res.json()
    return data.response || []
  } catch (e) {
    console.error('Error fetching live matches:', e)
    return []
  }
}

// Obtener partidos por fecha
export async function fetchMatchesByDate(date) {
  try {
    const res = await fetch(`${BASE_URL}/fixtures?date=${date}&league=1&season=2026`, { headers })
    const data = await res.json()
    return data.response || []
  } catch (e) {
    console.error('Error fetching matches by date:', e)
    return []
  }
}

// Obtener partido por ID de API
export async function fetchMatchById(fixtureId) {
  try {
    const res = await fetch(`${BASE_URL}/fixtures?id=${fixtureId}`, { headers })
    const data = await res.json()
    return data.response?.[0] || null
  } catch (e) {
    console.error('Error fetching match:', e)
    return null
  }
}

// Sincronizar partidos en vivo con Firestore
export async function syncLiveMatches() {
  try {
    // Buscar partidos en estado "live" en nuestra DB
    const q = query(collection(db, 'partidos'), where('estado', '==', 'live'))
    const snap = await getDocs(q)

    if (snap.empty) return

    // Para cada partido live, consultar la API si tiene apiFixtureId
    for (const docSnap of snap.docs) {
      const partido = docSnap.data()
      if (!partido.apiFixtureId) continue

      const match = await fetchMatchById(partido.apiFixtureId)
      if (!match) continue

      const goals = match.goals
      const status = match.fixture.status

      const marcador = `${goals.home ?? 0} - ${goals.away ?? 0}`
      const minuto = status.elapsed || 0

      // Determinar nuevo estado
      let nuevoEstado = 'live'
      if (['FT', 'AET', 'PEN'].includes(status.short)) {
        nuevoEstado = 'finalizado'
      }

      await updateDoc(doc(db, 'partidos', docSnap.id), {
        marcador,
        minuto,
        estado: nuevoEstado
      })

      console.log(`✓ Actualizado: ${partido.localName} vs ${partido.visitanteName} → ${marcador}`)
    }
  } catch (e) {
    console.error('Error syncing live matches:', e)
  }
}

// Sincronizar partidos próximos — marcar como live si ya empezaron
export async function syncUpcomingMatches() {
  try {
    const liveMatches = await fetchLiveMatches()
    if (!liveMatches.length) return

    // Buscar partidos próximos en nuestra DB que tengan apiFixtureId
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

      console.log(`▶ Partido iniciado: ${partido.localName} vs ${partido.visitanteName}`)
    }
  } catch (e) {
    console.error('Error syncing upcoming:', e)
  }
}
