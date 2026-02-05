const STORAGE_KEY = 'ez-roster-wnba-scoreboard'

/**
 * Read stored WNBA scoreboard from localStorage.
 * @returns {{ date: string, fetchedAtIso: string, games: Game[] } | null}
 */
export function getWnbaScoreboard() {
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
 * Save WNBA scoreboard to localStorage.
 * @param {{ date: string, fetchedAtIso: string, games: Game[] }} payload
 */
export function saveWnbaScoreboard(payload) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (e) {
    console.warn('Failed to save WNBA scoreboard:', e)
  }
}
