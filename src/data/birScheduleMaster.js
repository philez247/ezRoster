/**
 * BIR Schedule Master - single source of truth for all scraped games.
 * Games are never removed; only added or updated (e.g. status changes).
 */

const STORAGE_KEY = 'ez-roster-bir-schedule-master'
const CHANGES_STORAGE_KEY = 'ez-roster-bir-schedule-master-changes'

const SPORT_STORAGE_KEYS = [
  { key: 'ez-roster-nba-scoreboard', sport: 'NBA', lastKey: 'nba' },
  { key: 'ez-roster-nfl-scoreboard', sport: 'NFL', lastKey: 'nfl' },
  { key: 'ez-roster-nhl-scoreboard', sport: 'NHL', lastKey: 'nhl' },
  { key: 'ez-roster-wnba-scoreboard', sport: 'WNBA', lastKey: 'wnba' },
  { key: 'ez-roster-mlb-scoreboard', sport: 'MLB', lastKey: 'mlb' },
  { key: 'ez-roster-cfb-scoreboard', sport: 'CFB', lastKey: 'cfb' },
  { key: 'ez-roster-ncaam-scoreboard', sport: 'NCAAM', lastKey: 'ncaam' },
]

/** One-time migration: merge existing sport-specific storage into master. */
function migrateFromSportStorage() {
  const byKey = new Map()
  const lastSynced = {}
  for (const { key, sport, lastKey } of SPORT_STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const data = JSON.parse(raw)
      const games = data?.games || []
      const iso = data?.fetchedAtIso || null
      if (iso) lastSynced[lastKey] = iso
      for (const g of games) {
        const game = { ...g, sport: g.sport || sport }
        const k = gameKey(game.sport, game.gameId)
        if (k && !byKey.has(k)) byKey.set(k, game)
      }
    } catch {
      /* skip */
    }
  }
  const games = Array.from(byKey.values()).sort((a, b) =>
    (a.dateUtc || '').localeCompare(b.dateUtc || '')
  )
  if (games.length === 0) return null
  const payload = { games, lastSynced }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    return null
  }
  return payload
}

/** Build composite key for a game (sport + gameId). */
function gameKey(sport, gameId) {
  return `${(sport || '').toUpperCase()}:${gameId || ''}`
}

function gameLabel(game) {
  const away = game?.awayTeam?.name || 'Away'
  const home = game?.homeTeam?.name || 'Home'
  return `${away} @ ${home}`
}

function snapshotGame(game) {
  return {
    sport: (game?.sport || '').toUpperCase(),
    gameId: game?.gameId || '',
    dateUtc: game?.dateUtc || '',
    status: game?.status || '',
    statusDetail: game?.statusDetail || '',
    homeTeam: {
      name: game?.homeTeam?.name || '',
      score: game?.homeTeam?.score ?? null,
    },
    awayTeam: {
      name: game?.awayTeam?.name || '',
      score: game?.awayTeam?.score ?? null,
    },
    venue: {
      name: game?.venue?.name ?? game?.venue?.fullName ?? '',
      city: game?.venue?.city || '',
      state: game?.venue?.state || '',
    },
  }
}

function loadMasterChanges() {
  try {
    const raw = localStorage.getItem(CHANGES_STORAGE_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function saveMasterChanges(changes) {
  try {
    localStorage.setItem(CHANGES_STORAGE_KEY, JSON.stringify(changes))
  } catch (e) {
    console.warn('Failed to save BIR schedule changes:', e)
  }
}

function appendMasterChanges(entries, maxEntries = 1000) {
  if (!entries?.length) return
  const existing = loadMasterChanges()
  const merged = [...entries, ...existing]
  saveMasterChanges(merged.slice(0, maxEntries))
}

function buildChangedFields(existing, incoming) {
  const fields = []
  if ((existing.dateUtc || '') !== (incoming.dateUtc || '')) fields.push('dateUtc')
  if ((existing.status || '') !== (incoming.status || '')) fields.push('status')
  if ((existing.statusDetail || '') !== (incoming.statusDetail || '')) fields.push('statusDetail')
  const eHome = existing.homeTeam?.score
  const eAway = existing.awayTeam?.score
  const iHome = incoming.homeTeam?.score
  const iAway = incoming.awayTeam?.score
  if (eHome !== iHome || eAway !== iAway) fields.push('score')
  const eVenue = existing.venue?.name ?? existing.venue?.fullName ?? ''
  const iVenue = incoming.venue?.name ?? incoming.venue?.fullName ?? ''
  if (eVenue !== iVenue) fields.push('venue')
  return fields
}

/** Check if two games have different details (status, time, date, venue, scores, etc.). */
function gameDetailsChanged(existing, incoming) {
  if (existing.status !== incoming.status) return true
  if (existing.statusDetail !== incoming.statusDetail) return true
  const eHome = existing.homeTeam?.score
  const eAway = existing.awayTeam?.score
  const iHome = incoming.homeTeam?.score
  const iAway = incoming.awayTeam?.score
  if (eHome !== iHome || eAway !== iAway) return true
  if ((existing.dateUtc || '') !== (incoming.dateUtc || '')) return true
  const eVenue = existing.venue?.name ?? existing.venue?.fullName ?? ''
  const iVenue = incoming.venue?.name ?? incoming.venue?.fullName ?? ''
  if (eVenue !== iVenue) return true
  return false
}

/**
 * Human-readable list of what changed between existing and incoming game.
 * @param {object} existing - Game in master
 * @param {object} incoming - Game from scraper
 * @returns {string[]} e.g. ["Status: Scheduled → Final", "Venue: Stadium A → Stadium B"]
 */
export function getChangeDiffs(existing, incoming) {
  const diffs = []
  if (existing.status !== incoming.status) {
    diffs.push(`Status: ${existing.status || '—'} → ${incoming.status || '—'}`)
  }
  if (existing.statusDetail !== incoming.statusDetail) {
    diffs.push(`Status detail: ${existing.statusDetail || '—'} → ${incoming.statusDetail || '—'}`)
  }
  const eHome = existing.homeTeam?.score
  const eAway = existing.awayTeam?.score
  const iHome = incoming.homeTeam?.score
  const iAway = incoming.awayTeam?.score
  if (eHome !== iHome || eAway !== iAway) {
    diffs.push(`Score: ${eAway ?? '—'}-${eHome ?? '—'} → ${iAway ?? '—'}-${iHome ?? '—'}`)
  }
  if ((existing.dateUtc || '') !== (incoming.dateUtc || '')) {
    diffs.push(`Date/time: changed`)
  }
  const eVenue = existing.venue?.name ?? existing.venue?.fullName ?? ''
  const iVenue = incoming.venue?.name ?? incoming.venue?.fullName ?? ''
  if (eVenue !== iVenue) {
    diffs.push(`Venue: ${eVenue || '—'} → ${iVenue || '—'}`)
  }
  return diffs
}

/**
 * Read master BIR schedule from localStorage.
 * @returns {{ games: Game[], lastSynced: Record<string, string> } | null}
 */
export function getMaster() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const migrated = migrateFromSportStorage()
      if (migrated) return migrated
      return null
    }
    const data = JSON.parse(raw)
    if (!data || !Array.isArray(data.games)) return null
    return {
      games: data.games,
      lastSynced: data.lastSynced || {},
    }
  } catch {
    return null
  }
}

/**
 * Get all games from master.
 * @returns {Game[]}
 */
export function getMasterGames() {
  const m = getMaster()
  return m?.games || []
}

/**
 * Get games from master filtered by sport.
 * @param {string} sport - NBA, NFL, NHL, WNBA, MLB, CFB
 * @returns {Game[]}
 */
export function getMasterGamesBySport(sport) {
  const games = getMasterGames()
  const upper = (sport || '').toUpperCase()
  if (!upper) return games
  return games.filter((g) => (g.sport || '').toUpperCase() === upper)
}

/**
 * Get last synced timestamp for a sport.
 * @param {string} sport - nba, nfl, nhl, wnba, mlb, cfb
 * @returns {string | null}
 */
export function getLastSynced(sport) {
  const m = getMaster()
  if (!m?.lastSynced) return null
  const key = (sport || '').toLowerCase()
  return m.lastSynced[key] || null
}

/**
 * Compare incoming games with master without persisting.
 * Returns counts of what would be added and updated.
 * @param {Game[]} newGames - Games from ESPN (each must have sport)
 * @param {string} sport - NBA, NFL, NHL, WNBA, MLB, CFB
 * @returns {{ added: number, updated: number }}
 */
export function compareWithMaster(newGames, sport) {
  const m = getMaster()
  const existingGames = m?.games || []

  const byKey = new Map()
  for (const g of existingGames) {
    const k = gameKey(g.sport, g.gameId)
    if (k && !byKey.has(k)) byKey.set(k, { ...g })
  }

  let added = 0
  let updated = 0
  const sportUpper = (sport || '').toUpperCase()

  for (const g of newGames) {
    const game = { ...g, sport: g.sport || sportUpper }
    const k = gameKey(game.sport, game.gameId)
    if (!k) continue

    const existing = byKey.get(k)
    if (!existing) {
      byKey.set(k, game)
      added++
    } else if (gameDetailsChanged(existing, game)) {
      byKey.set(k, game)
      updated++
    }
  }

  return { added, updated }
}

/**
 * Compare incoming games with master; return counts and list of changes for prompting.
 * Used by SYNC: link by ESPN game ID; no action if unchanged; prompt to update if changed; add if new.
 * @param {object[]} newGames - Games from ESPN (each must have sport or pass sport)
 * @param {string} sport - NBA, NFL, NHL, WNBA, MLB, NCAAM
 * @returns {{ added: number, updated: number, unchanged: number, changes: Array<{ game: object, existing: object, incoming: object, diffs: string[] }> }}
 */
export function compareWithMasterDetailed(newGames, sport) {
  const m = getMaster()
  const existingGames = m?.games || []

  const byKey = new Map()
  for (const g of existingGames) {
    const k = gameKey(g.sport, g.gameId)
    if (k && !byKey.has(k)) byKey.set(k, { ...g })
  }

  let added = 0
  let updated = 0
  let unchanged = 0
  const changes = []
  const sportUpper = (sport || '').toUpperCase()

  for (const g of newGames) {
    const incoming = { ...g, sport: g.sport || sportUpper }
    const k = gameKey(incoming.sport, incoming.gameId)
    if (!k) continue

    const existing = byKey.get(k)
    if (!existing) {
      byKey.set(k, incoming)
      added++
    } else if (gameDetailsChanged(existing, incoming)) {
      const diffs = getChangeDiffs(existing, incoming)
      changes.push({
        game: incoming,
        existing,
        incoming,
        diffs,
      })
      byKey.set(k, incoming)
      updated++
    } else {
      unchanged++
    }
  }

  return { added, updated, unchanged, changes }
}

/**
 * Get persisted master change history, newest first.
 * @param {{ sport?: string, limit?: number }} [opts]
 * @returns {Array}
 */
export function getMasterChangeHistory(opts = {}) {
  const list = loadMasterChanges()
  const sportFilter = (opts?.sport || '').trim().toUpperCase()
  const limit = Number.isFinite(opts?.limit) ? Math.max(1, opts.limit) : null
  let out = list
  if (sportFilter) out = out.filter((c) => (c.sport || '').toUpperCase() === sportFilter)
  if (limit) out = out.slice(0, limit)
  return out
}

/**
 * Merge new games into master. Never removes games.
 * Adds new games, updates existing if details changed.
 * @param {Game[]} newGames - Games from ESPN (each must have sport added)
 * @param {string} sport - NBA, NFL, NHL, WNBA, MLB, CFB
 * @param {string} fetchedAtIso - Timestamp of this sync
 * @returns {{ added: number, updated: number }}
 */
export function mergeGamesIntoMaster(newGames, sport, fetchedAtIso) {
  const m = getMaster()
  const existingGames = m?.games || []
  const lastSynced = { ...(m?.lastSynced || {}) }

  const byKey = new Map()
  for (const g of existingGames) {
    const k = gameKey(g.sport, g.gameId)
    if (k && !byKey.has(k)) byKey.set(k, { ...g })
  }

  let added = 0
  let updated = 0
  const mergeChanges = []

  const sportUpper = (sport || '').toUpperCase()
  for (const g of newGames) {
    const game = { ...g, sport: g.sport || sportUpper }
    const k = gameKey(game.sport, game.gameId)
    if (!k) continue

    const existing = byKey.get(k)
    if (!existing) {
      byKey.set(k, game)
      added++
      mergeChanges.push({
        id: `chg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        detectedAt: fetchedAtIso || new Date().toISOString(),
        type: 'NEW_GAME',
        sport: game.sport || sportUpper,
        gameId: game.gameId || '',
        event: gameLabel(game),
        changedFields: ['new'],
        diffs: ['New game added to master'],
        before: null,
        after: snapshotGame(game),
      })
    } else if (gameDetailsChanged(existing, game)) {
      const diffs = getChangeDiffs(existing, game)
      const changedFields = buildChangedFields(existing, game)
      byKey.set(k, game)
      updated++
      mergeChanges.push({
        id: `chg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        detectedAt: fetchedAtIso || new Date().toISOString(),
        type: 'GAME_UPDATED',
        sport: game.sport || sportUpper,
        gameId: game.gameId || '',
        event: gameLabel(game),
        changedFields,
        diffs,
        before: snapshotGame(existing),
        after: snapshotGame(game),
      })
    }
  }

  const games = Array.from(byKey.values()).sort((a, b) =>
    (a.dateUtc || '').localeCompare(b.dateUtc || '')
  )

  lastSynced[(sport || '').toLowerCase()] = fetchedAtIso || new Date().toISOString()

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ games, lastSynced })
    )
  } catch (e) {
    console.warn('Failed to save BIR schedule master:', e)
  }

  appendMasterChanges(mergeChanges)

  return { added, updated }
}

/**
 * Add a single game to master (e.g. manually entered). Assigns gameId if missing.
 * @param {object} game - At least sport, homeTeam/awayTeam or event name
 * @returns {{ added: number, updated: number }}
 */
export function addGameToMaster(game) {
  const sport = (game?.sport || 'OTHER').toUpperCase()
  const gameId = game?.gameId || `manual-${Date.now()}`
  const withId = { ...game, sport, gameId }
  return mergeGamesIntoMaster([withId], sport, new Date().toISOString())
}
