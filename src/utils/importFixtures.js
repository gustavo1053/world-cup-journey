import { db } from '../firebase/config'
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore'

const API_KEY = '7899dd7698fa657b0f402b2b7d47851f'
const BASE_URL = 'https://v3.football.api-sports.io'
const WORLD_CUP_LEAGUE = 1
const SEASON = 2026

const headers = {
  'x-apisports-key': API_KEY,
  'x-apisports-host': 'v3.football.api-sports.io'
}

// Mapeo de país a emoji de bandera
const FLAG_MAP = {
  'Argentina': '🇦🇷', 'Brazil': '🇧🇷', 'France': '🇫🇷', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Germany': '🇩🇪', 'Spain': '🇪🇸', 'Portugal': '🇵🇹', 'Netherlands': '🇳🇱',
  'Italy': '🇮🇹', 'Belgium': '🇧🇪', 'Croatia': '🇭🇷', 'Uruguay': '🇺🇾',
  'Mexico': '🇲🇽', 'USA': '🇺🇸', 'Canada': '🇨🇦', 'Japan': '🇯🇵',
  'South Korea': '🇰🇷', 'Morocco': '🇲🇦', 'Senegal': '🇸🇳', 'Ghana': '🇬🇭',
  'Ecuador': '🇪🇨', 'Colombia': '🇨🇴', 'Chile': '🇨🇱', 'Peru': '🇵🇪',
  'Venezuela': '🇻🇪', 'Paraguay': '🇵🇾', 'Bolivia': '🇧🇴', 'Australia': '🇦🇺',
  'Iran': '🇮🇷', 'Saudi Arabia': '🇸🇦', 'Qatar': '🇶🇦', 'Denmark': '🇩🇰',
  'Switzerland': '🇨🇭', 'Poland': '🇵🇱', 'Serbia': '🇷🇸', 'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'Cameroon': '🇨🇲', 'Tunisia': '🇹🇳', 'Nigeria': '🇳🇬', 'Algeria': '🇩🇿',
  'Turkey': '🇹🇷', 'Ukraine': '🇺🇦', 'Austria': '🇦🇹', 'Sweden': '🇸🇪',
  'Norway': '🇳🇴', 'Czech Republic': '🇨🇿', 'Hungary': '🇭🇺', 'Romania': '🇷🇴',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Slovakia': '🇸🇰', 'Slovenia': '🇸🇮', 'Greece': '🇬🇷',
  'Costa Rica': '🇨🇷', 'Honduras': '🇭🇳', 'Panama': '🇵🇦', 'Jamaica': '🇯🇲',
  'Egypt': '🇪🇬', 'Ivory Coast': '🇨🇮', 'Mali': '🇲🇱', 'Zambia': '🇿🇲',
  'New Zealand': '🇳🇿', 'Indonesia': '🇮🇩', 'Thailand': '🇹🇭', 'China': '🇨🇳',
  'India': '🇮🇳', 'Israel': '🇮🇱', 'Uzbekistan': '🇺🇿', 'Iraq': '🇮🇶',
}

const getFlag = (country) => FLAG_MAP[country] || '🏳️'

const getFaseFromRound = (round) => {
  if (!round) return 'Fase de grupos'
  const r = round.toLowerCase()
  if (r.includes('group')) return 'Fase de grupos'
  if (r.includes('round of 16') || r.includes('1/8')) return 'Octavos de final'
  if (r.includes('quarter') || r.includes('1/4')) return 'Cuartos de final'
  if (r.includes('semi')) return 'Semifinal'
  if (r.includes('final') && !r.includes('semi') && !r.includes('third')) return 'Final'
  if (r.includes('third')) return 'Tercer puesto'
  return round
}

const formatHora = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const options = { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }
  const parts = new Intl.DateTimeFormat('es-AR', options).formatToParts(date)
  const day = parts.find(p => p.type === 'day')?.value
  const month = parts.find(p => p.type === 'month')?.value
  const hour = parts.find(p => p.type === 'hour')?.value
  const minute = parts.find(p => p.type === 'minute')?.value
  return `${day}/${month} · ${hour}:${minute} hs`
}

export async function importWorldCupFixtures(onProgress) {
  try {
    onProgress?.('Consultando API de partidos...')

    const res = await fetch(
      `${BASE_URL}/fixtures?league=${WORLD_CUP_LEAGUE}&season=${SEASON}`,
      { headers }
    )
    const data = await res.json()
    const fixtures = data.response || []

    if (!fixtures.length) {
      // Si no hay fixtures del 2026 aún, usar datos de prueba del Mundial 2022
      onProgress?.('Mundial 2026 no disponible aún. Importando Mundial 2022 como demo...')
      return importWorldCup2022(onProgress)
    }

    onProgress?.(`Encontrados ${fixtures.length} partidos. Importando...`)

    // Verificar cuáles ya existen
    const existingSnap = await getDocs(collection(db, 'partidos'))
    const existingIds = new Set(existingSnap.docs.map(d => d.data().apiFixtureId))

    let imported = 0
    for (const f of fixtures) {
      const fixtureId = f.fixture.id
      if (existingIds.has(fixtureId)) continue

      const local = f.teams.home.name
      const visitante = f.teams.away.name
      const status = f.fixture.status.short

      let estado = 'proximo'
      if (['1H', '2H', 'HT', 'ET', 'P'].includes(status)) estado = 'live'
      else if (['FT', 'AET', 'PEN'].includes(status)) estado = 'finalizado'

      await addDoc(collection(db, 'partidos'), {
        apiFixtureId: fixtureId,
        local: getFlag(local),
        localName: local,
        visitante: getFlag(visitante),
        visitanteName: visitante,
        hora: formatHora(f.fixture.date),
        fase: getFaseFromRound(f.league.round),
        cuotaLocal: 2.0,
        cuotaEmpate: 3.2,
        cuotaVisitante: 2.5,
        estado,
        marcador: estado !== 'proximo' ? `${f.goals.home ?? 0} - ${f.goals.away ?? 0}` : null,
        fecha: serverTimestamp()
      })
      imported++
      onProgress?.(`Importando partido ${imported}/${fixtures.length}...`)
    }

    return { success: true, count: imported }
  } catch (e) {
    console.error('Error importing fixtures:', e)
    return { success: false, error: e.message }
  }
}

// Demo con Mundial 2022 si el 2026 no está disponible aún
async function importWorldCup2022(onProgress) {
  try {
    const res = await fetch(
      `${BASE_URL}/fixtures?league=${WORLD_CUP_LEAGUE}&season=2022`,
      { headers }
    )
    const data = await res.json()
    const fixtures = data.response || []

    if (!fixtures.length) {
      return { success: false, error: 'No se encontraron partidos en la API' }
    }

    const existingSnap = await getDocs(collection(db, 'partidos'))
    const existingIds = new Set(existingSnap.docs.map(d => d.data().apiFixtureId))

    let imported = 0
    for (const f of fixtures) {
      const fixtureId = f.fixture.id
      if (existingIds.has(fixtureId)) continue

      const local = f.teams.home.name
      const visitante = f.teams.away.name

      await addDoc(collection(db, 'partidos'), {
        apiFixtureId: fixtureId,
        local: getFlag(local),
        localName: local,
        visitante: getFlag(visitante),
        visitanteName: visitante,
        hora: formatHora(f.fixture.date),
        fase: getFaseFromRound(f.league.round),
        cuotaLocal: 2.0,
        cuotaEmpate: 3.2,
        cuotaVisitante: 2.5,
        estado: 'finalizado',
        marcador: `${f.goals.home ?? 0} - ${f.goals.away ?? 0}`,
        fecha: serverTimestamp()
      })
      imported++
      if (imported % 10 === 0) onProgress?.(`Importando... ${imported} partidos`)
    }

    return { success: true, count: imported, demo: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
