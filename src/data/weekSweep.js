/**
 * Week sweep status: each week must be swept by an owner per sport.
 * 7 sports; 5 levels: No Info, In Progress, Pending, Completed, Archived.
 */

const STORAGE_KEY = 'ez-roster-week-sweep'

/** Sports that require an owner sweep (7 total). */
export const SWEEP_SPORTS = ['NBA', 'NFL', 'NHL', 'WNBA', 'MLB', 'NCAAM', 'Other']

/** Sweep status levels. */
export const SWEEP_LEVELS = ['No Info', 'In Progress', 'Pending', 'Completed', 'Archived']

const DEFAULT_LEVEL = 'No Info'

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

function saveAll(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('Failed to save week sweep:', e)
  }
}

/** Key for (year, week, sport). */
function key(year, week, sport) {
  return `${year}:${week}:${sport || ''}`
}

/**
 * Get sweep status for a (year, week, sport).
 * @returns {string} One of SWEEP_LEVELS
 */
export function getSweepStatus(year, week, sport) {
  const all = loadAll()
  const val = all[key(year, week, sport)]
  return SWEEP_LEVELS.includes(val) ? val : DEFAULT_LEVEL
}

/**
 * Set sweep status for a (year, week, sport).
 * @param {number} year
 * @param {number} week 1-52
 * @param {string} sport One of SWEEP_SPORTS
 * @param {string} level One of SWEEP_LEVELS
 */
export function setSweepStatus(year, week, sport, level) {
  if (!SWEEP_LEVELS.includes(level)) return
  const all = loadAll()
  all[key(year, week, sport)] = level
  saveAll(all)
}

/**
 * Get summary counts for a week: { 'No Info': n, 'In Progress': n, ... }.
 * @returns {{ [level: string]: number }}
 */
export function getWeekSummary(year, week) {
  const counts = {}
  SWEEP_LEVELS.forEach((l) => { counts[l] = 0 })
  SWEEP_SPORTS.forEach((sport) => {
    const level = getSweepStatus(year, week, sport)
    counts[level] = (counts[level] ?? 0) + 1
  })
  return counts
}
