const STORAGE_KEY = 'ez-roster-ncaam-teams-d1'

/**
 * Read stored NCAAM Division I teams from localStorage.
 * @returns {{ fetchedAtIso: string, teams: NcaamTeam[] } | null}
 */
export function getNcaamTeamsD1() {
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
 * Save NCAAM Division I teams to localStorage.
 * @param {{ fetchedAtIso: string, teams: NcaamTeam[] }} payload
 */
export function saveNcaamTeamsD1(payload) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (e) {
    console.warn('Failed to save NCAAM teams:', e)
  }
}
