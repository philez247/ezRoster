const STORAGE_KEY = 'ez-roster-mlb-scoreboard'

/**
 * Read stored MLB scoreboard from localStorage.
 * @returns {{ startDate?: string, endDate?: string, date?: string, fetchedAtIso: string, games: Game[] } | null}
 */
export function getMlbScoreboard() {
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
 * Save MLB scoreboard to localStorage.
 * @param {{ startDate?: string, endDate?: string, fetchedAtIso: string, games: Game[] }} payload
 */
export function saveMlbScoreboard(payload) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (e) {
    console.warn('Failed to save MLB scoreboard:', e)
  }
}
