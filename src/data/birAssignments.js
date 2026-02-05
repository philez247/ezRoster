/**
 * BIR Schedule assignments: location and traders (with role note) per game.
 * Keyed by game key (sport:gameId) matching birScheduleMaster.
 */

const STORAGE_KEY = 'ez-roster-bir-assignments'

export function gameKey(sport, gameId) {
  return `${(sport || '').toUpperCase()}:${gameId || ''}`
}

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const data = JSON.parse(raw)
    return typeof data === 'object' && data !== null ? data : {}
  } catch {
    return {}
  }
}

function saveAll(assignments) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments))
  } catch (e) {
    console.warn('Failed to save BIR assignments:', e)
  }
}

/**
 * Get assignment for a game.
 * @param {string} key - gameKey(sport, gameId)
 * @returns {{ location: string | null, traders: Array<{ traderId: string, roleNote: string }> }}
 */
export function getAssignment(key) {
  const all = loadAll()
  const a = all[key]
  if (!a) return { location: null, traders: [] }
  return {
    location: a.location ?? null,
    traders: Array.isArray(a.traders) ? a.traders : [],
  }
}

/**
 * Set location for a game.
 * @param {string} key - gameKey(sport, gameId)
 * @param {string | null} location - e.g. Dublin, Melbourne, New Jersey
 */
export function setLocation(key, location) {
  const all = loadAll()
  const existing = all[key] || { location: null, traders: [] }
  all[key] = { ...existing, location: location || null }
  saveAll(all)
}

/**
 * Set traders (with role note) for a game.
 * @param {string} key - gameKey(sport, gameId)
 * @param {Array<{ traderId: string, roleNote: string }>} traders
 */
export function setTraders(key, traders) {
  const all = loadAll()
  const existing = all[key] || { location: null, traders: [] }
  all[key] = { ...existing, traders: Array.isArray(traders) ? traders : [] }
  saveAll(all)
}

/**
 * Update full assignment for a game (location + traders).
 * @param {string} key - gameKey(sport, gameId)
 * @param {{ location?: string | null, traders?: Array<{ traderId: string, roleNote: string }> }} assignment
 */
export function setAssignment(key, assignment) {
  const all = loadAll()
  const existing = all[key] || { location: null, traders: [] }
  all[key] = {
    location: assignment.location !== undefined ? (assignment.location || null) : existing.location,
    traders: assignment.traders !== undefined ? (assignment.traders || []) : existing.traders,
  }
  saveAll(all)
}

/** Locations available for assignment (matches trader locations). */
export const ASSIGNMENT_LOCATIONS = ['Dublin', 'Melbourne', 'New Jersey']
