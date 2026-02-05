const STORAGE_KEY = 'ez-roster-wnba-teams'

/**
 * Read stored WNBA teams from localStorage.
 * @returns {{ fetchedAtIso: string, teams: WnbaTeam[] } | null}
 */
export function getWnbaTeams() {
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
 * Save WNBA teams to localStorage.
 * @param {{ fetchedAtIso: string, teams: WnbaTeam[] }} payload
 */
export function saveWnbaTeams(payload) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (e) {
    console.warn('Failed to save WNBA teams:', e)
  }
}
