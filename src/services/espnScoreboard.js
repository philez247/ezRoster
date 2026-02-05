/**
 * Shared ESPN scoreboard helpers. Normalizes ESPN API response into Game[] shape.
 */

export function normalizeEspnEventToGame(event) {
  const comp = event?.competitions?.[0]
  const competitors = comp?.competitors || []
  const home = competitors.find((c) => c?.homeAway === 'home')
  const away = competitors.find((c) => c?.homeAway === 'away')
  const parseScore = (v) => {
    if (v == null || v === '') return null
    const n = Number(v)
    return Number.isNaN(n) ? null : n
  }
  const statusObj = comp?.status?.type
  const status = statusObj?.name || statusObj?.description || 'Scheduled'
  const statusDetail = statusObj?.shortDetail || statusObj?.detail || ''
  const venueObj = comp?.venue
  const venue = venueObj
    ? {
        name: venueObj.fullName || venueObj.name || '',
        city: venueObj.address?.city || '',
        state: venueObj.address?.state || '',
      }
    : null
  return {
    gameId: event?.id || '',
    dateUtc: event?.date || '',
    status,
    statusDetail,
    homeTeam: {
      id: home?.id || '',
      teamId: home?.team?.id ?? home?.id ?? '',
      name: home?.team?.displayName || home?.team?.name || '',
      abbrev: home?.team?.abbreviation || '',
      score: parseScore(home?.score),
    },
    awayTeam: {
      id: away?.id || '',
      teamId: away?.team?.id ?? away?.id ?? '',
      name: away?.team?.displayName || away?.team?.name || '',
      abbrev: away?.team?.abbreviation || '',
      score: parseScore(away?.score),
    },
    venue,
  }
}

export function normalizeEspnScoreboardToGames(json) {
  const events = json?.events || []
  return events.map(normalizeEspnEventToGame)
}

export async function fetchScoreboardViaProxy(league, date) {
  const url = `/api/espn/${league}/scoreboard?date=${encodeURIComponent(date)}`
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}
