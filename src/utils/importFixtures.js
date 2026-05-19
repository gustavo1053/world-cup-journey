import { db } from '../firebase/config'
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore'

const API_BASE = '/api/fixtures'

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
  'Egypt': '🇪🇬', 'Ivory Coast': '🇨🇮', 'New Zealand': '🇳🇿', 'Indonesia': '🇮🇩',
  'China': '🇨🇳', 'Israel': '🇮🇱', 'Uzbekistan': '🇺🇿', 'Iraq': '🇮🇶',
}

const getFlag = (country) => FLAG_MAP[country] || '🏳️'

const getFaseFromRound = (round) => {
  if (!round) return 'Fase de grupos'
  const r = round.toLowerCase()
  if (r.includes('group')) return 'Fase de grupos'
  if (r.includes('round of 16') || r.includes('1/8')) return 'Octavos de final'
  if (r.includes('quarter') || r.includes('1/4')) return 'Cuartos de final'
  if (r.includes('semi')) return 'Semifinal'
  if (r.includes('third')) return 'Tercer puesto'
  if (r.includes('final')) return 'Final'
  return round
}

const formatHora = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const opts = { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }
  const parts = new Intl.DateTimeFormat('es-AR', opts).formatToParts(date)
  const day = parts.find(p => p.type === 'day')?.value
  const month = parts.find(p => p.type === 'month')?.value
  const hour = parts.find(p => p.type === 'hour')?.value
  const minute = parts.find(p => p.type === 'minute')?.value
  return `${day}/${month} · ${hour}:${minute} hs`
}

export async function importWorldCupFixtures(onProgress, leagueId = '1', season = '2026') {
  try {
    onProgress?.(`Consultando liga ${leagueId} temporada ${season}...`)

    const res = await fetch(`${API_BASE}?league=${leagueId}&season=${season}`)
    const data = await res.json()
    const fixtures = data.response || []

    if (!fixtures.length) {
      return { success: false, error: `No se encontraron partidos para liga ${leagueId} temporada ${season}` }
    }

    onProgress?.(`Encontrados ${fixtures.length} partidos. Importando...`)

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
        leagueId: parseInt(leagueId),
        leagueName: f.league.name,
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
      if (imported % 10 === 0) onProgress?.(`Importando... ${imported}/${fixtures.length}`)
    }

    return { success: true, count: imported }
  } catch (e) {
    console.error('Error importing fixtures:', e)
    return { success: false, error: e.message }
  }
}
