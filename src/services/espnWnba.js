/**
 * ESPN WNBA scoreboard service.
 * Calls our proxy, normalizes into Game[], persists to localStorage.
 */

import {
  fetchScoreboardViaProxy,
  normalizeEspnEventToGame,
  normalizeEspnScoreboardToGames,
} from './espnScoreboard'
import { mergeGamesIntoMaster } from '../data/birScheduleMaster'
import { saveWnbaScoreboard } from '../data/wnbaScoreboard'

/** Format today as YYYYMMDD in local timezone. */
export function todayYYYYMMDD() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

/** Enumerate dates in range [start, end] inclusive. YYYYMMDD. */
function datesInRange(startYYYYMMDD, endYYYYMMDD) {
  const dates = []
  const start = new Date(
    startYYYYMMDD.slice(0, 4),
    Number(startYYYYMMDD.slice(4, 6)) - 1,
    Number(startYYYYMMDD.slice(6, 8))
  )
  const end = new Date(
    endYYYYMMDD.slice(0, 4),
    Number(endYYYYMMDD.slice(4, 6)) - 1,
    Number(endYYYYMMDD.slice(6, 8))
  )
  const cur = new Date(start)
  while (cur <= end) {
    const y = cur.getFullYear()
    const m = String(cur.getMonth() + 1).padStart(2, '0')
    const d = String(cur.getDate()).padStart(2, '0')
    dates.push(`${y}${m}${d}`)
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

/**
 * Sync WNBA scoreboard for a given date (YYYYMMDD).
 * @param {string} date - YYYYMMDD
 * @param {(date: string, gamesCount: number) => void} [onProgress]
 * @param {{ skipSave?: boolean, skipMerge?: boolean }} [opts]
 * @returns {Promise<{ games: Game[], fetchedAtIso: string, added?: number, updated?: number }>}
 */
export async function syncWnbaScoreboard(date, onProgress, opts = {}) {
  const data = await fetchScoreboardViaProxy('wnba', date)
  const games = normalizeEspnScoreboardToGames(data).map((g) => ({ ...g, sport: 'WNBA' }))
  if (onProgress) onProgress(date, games.length, 1, 1)
  const fetchedAtIso = new Date().toISOString()
  if (!opts.skipSave) saveWnbaScoreboard({ date, fetchedAtIso, games })
  let added, updated
  if (!opts.skipMerge) {
    const result = mergeGamesIntoMaster(games, 'WNBA', fetchedAtIso)
    added = result.added
    updated = result.updated
  }
  return { games, fetchedAtIso, added, updated }
}

/**
 * Sync WNBA scoreboard for a date range.
 * @param {string} startDate - YYYYMMDD
 * @param {string} endDate - YYYYMMDD
 * @param {(date: string, gamesCount: number) => void} [onProgress]
 * @param {{ skipSave?: boolean, skipMerge?: boolean }} [opts]
 * @returns {Promise<{ games: Game[], fetchedAtIso: string, added?: number, updated?: number }>}
 */
export async function syncWnbaScoreboardRange(startDate, endDate, onProgress, opts = {}) {
  const dates = datesInRange(startDate, endDate)
  const allGames = []
  const seen = new Set()
  const totalDays = dates.length
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i]
    const data = await fetchScoreboardViaProxy('wnba', date)
    const events = data?.events || []
    for (const event of events) {
      const game = normalizeEspnEventToGame(event)
      if (game && game.gameId && !seen.has(game.gameId)) {
        seen.add(game.gameId)
        allGames.push(game)
      }
    }
    if (onProgress) onProgress(date, allGames.length, i + 1, totalDays)
  }
  const withSport = allGames.map((g) => ({ ...g, sport: 'WNBA' }))
  const fetchedAtIso = new Date().toISOString()
  let added, updated
  if (!opts.skipMerge) {
    const result = mergeGamesIntoMaster(withSport, 'WNBA', fetchedAtIso)
    added = result.added
    updated = result.updated
  }
  return { games: withSport, fetchedAtIso, added, updated }
}
