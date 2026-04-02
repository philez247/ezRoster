const STORAGE_KEY = 'ez-roster-allocation-engine-settings'

const DEFAULT_SETTINGS = {
  includeNoPreference: true,
  protectLockedPerDay: true,
  countLockedTowardWeeklyCap: true,
  maxGamesPerTrader: 5,
}

function sanitize(settings) {
  const raw = settings || {}
  const maxGames = Number(raw.maxGamesPerTrader)
  return {
    includeNoPreference: raw.includeNoPreference !== false,
    protectLockedPerDay: raw.protectLockedPerDay !== false,
    countLockedTowardWeeklyCap: raw.countLockedTowardWeeklyCap !== false,
    maxGamesPerTrader: Number.isFinite(maxGames)
      ? Math.min(14, Math.max(1, Math.round(maxGames)))
      : DEFAULT_SETTINGS.maxGamesPerTrader,
  }
}

export function getAllocationEngineSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    return sanitize(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function setAllocationEngineSettings(next) {
  const settings = sanitize(next)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (e) {
    console.warn('Failed to save allocation engine settings:', e)
  }
  return settings
}

