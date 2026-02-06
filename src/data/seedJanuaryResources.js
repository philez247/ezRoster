/**
 * Seed dummy January resources: games, locations, and assigned traders.
 * Run from Resources page "Seed January" button or browser console:
 *   import { seedJanuaryResources } from './data/seedJanuaryResources'
 *   seedJanuaryResources()
 */

import { getMasterGames, mergeGamesIntoMaster } from './birScheduleMaster'
import { getTraders } from './traders'
import { seedTradersIfEmpty } from './traders'
import {
  getAssignment,
  setAssignment,
  gameKey,
  ASSIGNMENT_LOCATIONS,
} from './birAssignments'

const COMBO_LOCATIONS = ['Dublin', 'Melbourne', 'New Jersey']
const SPORTS = ['NBA', 'NHL', 'NFL', 'WNBA']
const TEAMS = [
  ['Lakers', 'Celtics'],
  ['Bulls', 'Heat'],
  ['Warriors', 'Nuggets'],
  ['Knicks', 'Nets'],
  ['Rockets', 'Mavericks'],
  ['Cavaliers', 'Bucks'],
  ['Suns', 'Clippers'],
  ['76ers', 'Raptors'],
]

/** Create dummy games for January. */
function createDummyJanuaryGames(year) {
  const games = []
  let gameIdx = 0
  for (let day = 1; day <= 31; day++) {
    const date = new Date(year, 0, day)
    if (date.getMonth() !== 0) break
    const sportsToday = SPORTS.slice(0, 2 + (day % 2))
    sportsToday.forEach((sport, si) => {
      const [away, home] = TEAMS[(day + si) % TEAMS.length]
      const hour = 19 + (si % 3)
      const dateUtc = new Date(Date.UTC(year, 0, day, hour, 0, 0)).toISOString()
      games.push({
        sport,
        gameId: `jan-${year}-${String(day).padStart(2, '0')}-${gameIdx}`,
        dateUtc,
        homeTeam: { name: home },
        awayTeam: { name: away },
        status: 'Scheduled',
      })
      gameIdx++
    })
  }
  return games
}

/** Get traders by location. */
function getTradersByLocation(traders) {
  const byLoc = new Map()
  for (const t of traders) {
    const loc = (t.location || '').trim()
    if (!loc) continue
    if (!byLoc.has(loc)) byLoc.set(loc, [])
    byLoc.get(loc).push(t)
  }
  return byLoc
}

/** Pick a trader for a location (rotating through available). */
function pickTraderForLocation(byLoc, location, index) {
  const locs = location === 'Combo' ? COMBO_LOCATIONS : [location]
  const pool = []
  for (const loc of locs) {
    const list = byLoc.get(loc) || []
    pool.push(...list)
  }
  if (pool.length === 0) return null
  return pool[index % pool.length]
}

/**
 * Seed January: ensure traders, create dummy games if needed, assign locations and traders.
 * @param {number} [year] - Year for January (default: current year)
 * @returns {{ gamesCreated: number, assignmentsUpdated: number }}
 */
export function seedJanuaryResources(year) {
  const targetYear = year ?? new Date().getFullYear()
  seedTradersIfEmpty()
  const traders = getTraders().filter((t) => t.active !== false)
  const byLoc = getTradersByLocation(traders)

  const existingGames = getMasterGames()
  const janExisting = existingGames.filter((g) => {
    if (!g?.dateUtc) return false
    const d = new Date(g.dateUtc)
    return !Number.isNaN(d.getTime()) && d.getUTCMonth() === 0 && d.getUTCFullYear() === targetYear
  })

  let gamesCreated = 0
  if (janExisting.length < 10) {
    const dummyGames = createDummyJanuaryGames(targetYear)
    dummyGames.forEach((g) => {
      const { added } = mergeGamesIntoMaster(
        [g],
        g.sport,
        new Date().toISOString()
      )
      if (added) gamesCreated++
    })
  }

  const allJanGames = getMasterGames().filter((g) => {
    if (!g?.dateUtc) return false
    const d = new Date(g.dateUtc)
    return !Number.isNaN(d.getTime()) && d.getUTCMonth() === 0 && d.getUTCFullYear() === targetYear
  })

  const locations = ['Dublin', 'Melbourne', 'New Jersey', 'Combo']
  let assignmentsUpdated = 0
  let traderIndex = { Dublin: 0, Melbourne: 0, 'New Jersey': 0, Combo: 0 }

  for (let i = 0; i < allJanGames.length; i++) {
    const g = allJanGames[i]
    const key = gameKey(g.sport, g.gameId)
    if (!key) continue

    const loc = locations[i % locations.length]
    const trader = pickTraderForLocation(byLoc, loc, traderIndex[loc])
    traderIndex[loc]++

    setAssignment(key, {
      location: loc,
      traders: trader ? [{ traderId: trader.traderId, roleNote: '' }] : [],
    })
    assignmentsUpdated++
  }

  return { gamesCreated, assignmentsUpdated }
}
