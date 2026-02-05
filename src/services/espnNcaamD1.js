/**
 * ESPN NCAAM Division I teams service.
 * Fetches teams from D1 group (conferences under NCAA Division I), normalizes, persists to localStorage.
 */

import { saveNcaamTeamsD1 } from '../data/ncaamTeams'

const NCAAM_TEAMS_URL = '/api/espn/ncaam/teams'

function isD1League(league) {
  if (!league) return false
  const name = (league.name || '').toLowerCase()
  const short = (league.shortName || '').toLowerCase()
  const abbr = (league.abbreviation || '').toLowerCase()
  const text = `${name} ${short} ${abbr}`
  return text.includes('division i') || text.includes("ncaa men's basketball") || text.includes('ncaam')
}

function collectTeamsFromGroup(group, conferenceName) {
  const teams = group?.teams || []
  const conference = conferenceName ?? group?.name ?? null
  return teams.map((t) => {
    if (!t?.id) return null
    return {
      id: String(t.id),
      name: t.displayName || t.name || '',
      shortName: t.shortDisplayName || t.shortName || '',
      abbreviation: t.abbreviation || '',
      conference: conference || null,
    }
  }).filter(Boolean)
}

/**
 * Traverse leagues/groups to find D1 and collect all teams (resilient to schema).
 * @param {any} json - ESPN teams API response with enable=groups
 * @returns {NcaamTeam[]}
 */
function extractD1Teams(json) {
  const sports = json?.sports
  if (!Array.isArray(sports)) return []

  for (const sport of sports) {
    const leagues = sport?.leagues
    if (!Array.isArray(leagues)) continue

    for (const league of leagues) {
      if (!isD1League(league)) continue

      const out = []
      const groups = league?.groups || []

      for (const group of groups) {
        const conference = group?.name ?? null
        out.push(...collectTeamsFromGroup(group, conference))
        const children = group?.groups
        if (Array.isArray(children)) {
          for (const child of children) {
            const childConf = child?.name ?? conference
            out.push(...collectTeamsFromGroup(child, childConf))
          }
        }
      }

      if (out.length > 0) return out
    }
  }

  return []
}

/**
 * Sync NCAAM Division I teams from ESPN.
 * @returns {Promise<{ teams: NcaamTeam[], fetchedAtIso: string }>}
 */
export async function syncNcaamD1Teams() {
  const res = await fetch(NCAAM_TEAMS_URL)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.error || `HTTP ${res.status}`
    if (res.status === 404) {
      throw new Error(`${msg} Run the proxy server: npm run server (or npm run dev:all).`)
    }
    throw new Error(msg)
  }
  const json = await res.json()

  const raw = extractD1Teams(json)
  const seen = new Set()
  const teams = []
  for (const t of raw) {
    if (t?.id && !seen.has(t.id)) {
      seen.add(t.id)
      teams.push(t)
    }
  }
  teams.sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  const fetchedAtIso = new Date().toISOString()
  saveNcaamTeamsD1({ fetchedAtIso, teams })

  return { teams, fetchedAtIso }
}
