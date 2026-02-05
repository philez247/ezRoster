/**
 * ESPN CFB Division I teams service.
 * Fetches FBS (group 80) + FCS (group 81), normalizes, persists to localStorage.
 */

import { saveCfbTeamsD1 } from '../data/cfbTeams'

const CFB_TEAMS_BASE = '/api/espn/cfb/teams'

/**
 * Fetch CFB teams from proxy for a given group (80=FBS, 81=FCS).
 * @param {string} group - "80" or "81"
 * @returns {Promise<any>}
 */
async function fetchCfbTeamsViaProxy(group) {
  const url = `${CFB_TEAMS_BASE}?group=${encodeURIComponent(group)}`
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

/**
 * Extract teams from ESPN CFB teams response.
 * Structure: sports[0].leagues[0].groups[] -> each group has name (conference) and teams[]
 * @param {any} json - ESPN API response
 * @param {"FBS"|"FCS"} groupLabel
 * @returns {CfbTeam[]}
 */
function normalizeEspnTeamsToCfbTeams(json, groupLabel) {
  const groups = json?.sports?.[0]?.leagues?.[0]?.groups || []
  const out = []
  for (const group of groups) {
    const conference = group?.name || null
    const teams = group?.teams || []
    for (const t of teams) {
      if (!t?.id) continue
      out.push({
        id: String(t.id),
        name: t.displayName || t.name || '',
        shortName: t.shortDisplayName || t.shortName || '',
        abbreviation: t.abbreviation || '',
        group: groupLabel,
        conference,
      })
    }
  }
  return out
}

/**
 * Sync CFB Division I teams (FBS + FCS) from ESPN.
 * @returns {Promise<{ teams: CfbTeam[], fbsCount: number, fcsCount: number, fetchedAtIso: string }>}
 */
export async function syncCfbTeamsD1() {
  const [fbsJson, fcsJson] = await Promise.all([
    fetchCfbTeamsViaProxy('80'),
    fetchCfbTeamsViaProxy('81'),
  ])
  const fbsTeams = normalizeEspnTeamsToCfbTeams(fbsJson, 'FBS')
  const fcsTeams = normalizeEspnTeamsToCfbTeams(fcsJson, 'FCS')

  const seen = new Set()
  const teams = []
  for (const t of [...fbsTeams, ...fcsTeams]) {
    if (t.id && !seen.has(t.id)) {
      seen.add(t.id)
      teams.push(t)
    }
  }
  teams.sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  const fetchedAtIso = new Date().toISOString()
  saveCfbTeamsD1({ fetchedAtIso, teams })

  const fbsCount = fbsTeams.length
  const fcsCount = fcsTeams.length
  return { teams, fbsCount, fcsCount, fetchedAtIso }
}
