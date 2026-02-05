const STORAGE_KEY = 'ez-roster-ncaam-scoreboard'

/**
 * Read stored NCAAM scoreboard (D1 v D1) from localStorage.
 * @returns {{ date: string, fetchedAtIso: string, games: Game[] } | null}
 */
export function getNcaamScoreboard() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || !data.date || !Array.isArray(data.games)) return null
    return {
      date: data.date,
      fetchedAtIso: data.fetchedAtIso || '',
      games: data.games,
    }
  } catch {
    return null
  }
}

/**
 * Save NCAAM scoreboard to localStorage.
 * @param {{ date: string, fetchedAtIso: string, games: Game[] }} payload
 */
export function saveNcaamScoreboard(payload) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (e) {
    console.warn('Failed to save NCAAM scoreboard:', e)
  }
}
