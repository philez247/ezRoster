/**
 * ESPN NCAAM scoreboard service (D1 v D1 only).
 * Uses D1 team list from localStorage to filter games.
 */

import { normalizeEspnScoreboardToGames } from './espnScoreboard'
import { getNcaamTeamsD1 } from '../data/ncaamTeams'
import { saveNcaamScoreboard } from '../data/ncaamScoreboard'
import { mergeGamesIntoMaster } from '../data/birScheduleMaster'
import { syncNcaamD1Teams } from './espnNcaamD1'

const NCAAM_SCOREBOARD_URL = '/api/espn/ncaam/scoreboard'

function teamIdFromGameTeam(team) {
  const id = team?.teamId ?? team?.id
  if (id == null || id === '') return ''
  return String(id)
}

/**
 * Sync NCAAM scoreboard for a date (D1 v D1 only).
 * If D1 team list is missing, runs syncNcaamD1Teams() once.
 * @param {string} dateYYYYMMDD - YYYYMMDD
 * @param {{ skipSave?: boolean, skipMerge?: boolean }} [opts] - If skipSave/skipMerge, fetch only (no persist, no merge).
 * @returns {Promise<{ date: string, games: Game[], fetchedAtIso: string, added?: number, updated?: number }>}
 */
export async function syncNcaamScoreboard(dateYYYYMMDD, opts = {}) {
  let d1 = getNcaamTeamsD1()
  if (!d1?.teams?.length) {
    await syncNcaamD1Teams()
    d1 = getNcaamTeamsD1()
  }
  if (!d1?.teams?.length) {
    throw new Error('Sync D1 teams first: no NCAAM D1 teams in storage.')
  }

  const d1Ids = new Set(d1.teams.map((t) => String(t.id)))

  const url = `${NCAAM_SCOREBOARD_URL}?date=${encodeURIComponent(dateYYYYMMDD)}`
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  const json = await res.json()

  const allGames = normalizeEspnScoreboardToGames(json)
  const games = allGames.filter((g) => {
    const homeId = teamIdFromGameTeam(g?.homeTeam)
    const awayId = teamIdFromGameTeam(g?.awayTeam)
    if (!homeId || !awayId) return false
    return d1Ids.has(homeId) && d1Ids.has(awayId)
  })

  const withSport = games.map((g) => ({ ...g, sport: 'NCAAM' }))
  const fetchedAtIso = new Date().toISOString()
  const payload = { date: dateYYYYMMDD, fetchedAtIso, games }

  if (!opts.skipSave) saveNcaamScoreboard({ ...payload, games: withSport })
  let added, updated
  if (!opts.skipMerge) {
    const result = mergeGamesIntoMaster(withSport, 'NCAAM', fetchedAtIso)
    added = result.added
    updated = result.updated
  }
  return { ...payload, games: withSport, added, updated }
}

function parseYmdToDate(yyyymmdd) {
  return new Date(
    Number(yyyymmdd.slice(0, 4)),
    Number(yyyymmdd.slice(4, 6)) - 1,
    Number(yyyymmdd.slice(6, 8))
  )
}

function datesInRange(startYYYYMMDD, endYYYYMMDD) {
  const out = []
  const start = parseYmdToDate(startYYYYMMDD)
  const end = parseYmdToDate(endYYYYMMDD)
  const cur = new Date(start)
  while (cur <= end) {
    const y = cur.getFullYear()
    const m = String(cur.getMonth() + 1).padStart(2, '0')
    const d = String(cur.getDate()).padStart(2, '0')
    out.push(`${y}${m}${d}`)
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

/**
 * Sync NCAAM scoreboard for a date range (D1 v D1 only).
 * @param {string} startYYYYMMDD
 * @param {string} endYYYYMMDD
 * @param {{ skipSave?: boolean, skipMerge?: boolean }} [opts]
 * @returns {Promise<{ startDate: string, endDate: string, games: Game[], fetchedAtIso: string, added?: number, updated?: number }>}
 */
export async function syncNcaamScoreboardRange(startYYYYMMDD, endYYYYMMDD, opts = {}) {
  const dates = datesInRange(startYYYYMMDD, endYYYYMMDD)
  let d1 = getNcaamTeamsD1()
  if (!d1?.teams?.length) {
    await syncNcaamD1Teams()
    d1 = getNcaamTeamsD1()
  }
  if (!d1?.teams?.length) {
    throw new Error('Sync D1 teams first: no NCAAM D1 teams in storage.')
  }
  const d1Ids = new Set(d1.teams.map((t) => String(t.id)))
  const seen = new Set()
  const games = []

  for (const dateYYYYMMDD of dates) {
    const url = `${NCAAM_SCOREBOARD_URL}?date=${encodeURIComponent(dateYYYYMMDD)}`
    const res = await fetch(url)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `HTTP ${res.status}`)
    }
    const json = await res.json()
    const dailyGames = normalizeEspnScoreboardToGames(json).filter((g) => {
      const homeId = teamIdFromGameTeam(g?.homeTeam)
      const awayId = teamIdFromGameTeam(g?.awayTeam)
      if (!homeId || !awayId) return false
      return d1Ids.has(homeId) && d1Ids.has(awayId)
    })
    for (const g of dailyGames) {
      const k = g.gameId || `${g.dateUtc || ''}:${g.homeTeam?.name || ''}:${g.awayTeam?.name || ''}`
      if (seen.has(k)) continue
      seen.add(k)
      games.push(g)
    }
  }

  const withSport = games.map((g) => ({ ...g, sport: 'NCAAM' }))
  const fetchedAtIso = new Date().toISOString()
  if (!opts.skipSave) saveNcaamScoreboard({ date: startYYYYMMDD, fetchedAtIso, games: withSport })
  let added, updated
  if (!opts.skipMerge) {
    const result = mergeGamesIntoMaster(withSport, 'NCAAM', fetchedAtIso)
    added = result.added
    updated = result.updated
  }
  return {
    startDate: startYYYYMMDD,
    endDate: endYYYYMMDD,
    fetchedAtIso,
    games: withSport,
    added,
    updated,
  }
}

/** Format today as YYYYMMDD in local timezone. */
export function todayYYYYMMDD() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}
