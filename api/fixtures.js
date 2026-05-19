export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const { league = 1, season = 2026, live, id, date } = req.query

  let url = `https://v3.football.api-sports.io/fixtures?`
  if (live) url += `live=all&`
  if (id) url += `id=${id}&`
  if (date) url += `date=${date}&`
  if (!live && !id) url += `league=${league}&season=${season}&`

  try {
    const response = await fetch(url, {
      headers: {
        'x-apisports-key': '7899dd7698fa657b0f402b2b7d47851f',
        'x-apisports-host': 'v3.football.api-sports.io'
      }
    })
    const data = await response.json()
    return res.status(200).json(data)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
