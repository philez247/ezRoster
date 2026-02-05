const STORAGE_KEY = 'ez-roster-cfb-teams-d1'

/**
 * Read stored CFB Division I teams from localStorage.
 * @returns {{ fetchedAtIso: string, teams: CfbTeam[] } | null}
 */
export function getCfbTeamsD1() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || !Array.isArray(data.teams)) return null
    return {
      fetchedAtIso: data.fetchedAtIso || '',
      teams: data.teams,
    }
  } catch {
    return null
  }
}

/**
 * Save CFB Division I teams to localStorage.
 * @param {{ fetchedAtIso: string, teams: CfbTeam[] }} payload
 */
export function saveCfbTeamsD1(payload) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (e) {
    console.warn('Failed to save CFB teams:', e)
  }
}
