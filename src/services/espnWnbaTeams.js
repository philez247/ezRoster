/**
 * ESPN WNBA teams service.
 * Fetches team list via proxy, normalizes, persists to localStorage.
 */

import { saveWnbaTeams } from '../data/wnbaTeams'

const WNBA_TEAMS_URL = '/api/espn/wnba/teams'

/**
 * Normalize ESPN WNBA teams response into WnbaTeam[].
 * ESPN response: sports[0].leagues[0].teams[] with each item as { team: { id, displayName, ... } }
 * @param {any} json - ESPN API response
 * @returns {WnbaTeam[]}
 */
function normalizeWnbaTeams(json) {
  const raw = json?.sports?.[0]?.leagues?.[0]?.teams || []
  return raw
    .map((item) => item?.team ?? item)
    .filter((t) => t?.id)
    .map((t) => ({
      id: String(t.id),
      name: t.displayName || t.name || '',
      abbreviation: t.abbreviation || '',
      location: t.location || '',
    }))
}

/**
 * Sync WNBA teams from ESPN.
 * @returns {Promise<{ teams: WnbaTeam[], fetchedAtIso: string }>}
 */
export async function syncWnbaTeams() {
  const res = await fetch(WNBA_TEAMS_URL)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  const json = await res.json()
  const teams = normalizeWnbaTeams(json)
  const fetchedAtIso = new Date().toISOString()
  saveWnbaTeams({ fetchedAtIso, teams })
  return { teams, fetchedAtIso }
}
