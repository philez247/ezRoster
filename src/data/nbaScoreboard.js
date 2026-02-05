const STORAGE_KEY = 'ez-roster-nba-scoreboard'

/**
 * Read stored NBA scoreboard from localStorage.
 * Supports legacy { date } or new { startDate, endDate }.
 * @returns {{ startDate?: string, endDate?: string, date?: string, fetchedAtIso: string, games: Game[] } | null}
 */
export function getNbaScoreboard() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || !Array.isArray(data.games)) return null
    return {
      startDate: data.startDate || data.date,
      endDate: data.endDate || data.date,
      date: data.date,
      fetchedAtIso: data.fetchedAtIso || '',
      games: data.games,
    }
  } catch {
    return null
  }
}

/**
 * Save NBA scoreboard to localStorage.
 * @param {{ startDate?: string, endDate?: string, fetchedAtIso: string, games: Game[] }} payload
 */
export function saveNbaScoreboard(payload) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (e) {
    console.warn('Failed to save NBA scoreboard:', e)
  }
}
