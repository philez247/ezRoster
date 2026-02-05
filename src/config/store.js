const STORAGE_KEY = 'ez-roster-config'

const defaultConfig = () => ({
  sports: [],
  locations: [],
  managers: [],
})

export function getConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultConfig()
    const data = JSON.parse(raw)
    return {
      sports: Array.isArray(data.sports) ? data.sports : [],
      locations: Array.isArray(data.locations) ? data.locations : [],
      managers: Array.isArray(data.managers) ? data.managers : [],
    }
  } catch {
    return defaultConfig()
  }
}

export function saveConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch (e) {
    console.warn('Failed to save config:', e)
  }
}

export function addSport(name) {
  const config = getConfig()
  const trimmed = (name || '').trim()
  if (!trimmed || config.sports.includes(trimmed)) return config
  config.sports = [...config.sports, trimmed].sort((a, b) => a.localeCompare(b))
  saveConfig(config)
  return config
}

export function removeSport(name) {
  const config = getConfig()
  config.sports = config.sports.filter((s) => s !== name)
  saveConfig(config)
  return config
}

export function addLocation(name) {
  const config = getConfig()
  const trimmed = (name || '').trim()
  if (!trimmed || config.locations.includes(trimmed)) return config
  config.locations = [...config.locations, trimmed].sort((a, b) => a.localeCompare(b))
  saveConfig(config)
  return config
}

export function removeLocation(name) {
  const config = getConfig()
  config.locations = config.locations.filter((l) => l !== name)
  saveConfig(config)
  return config
}

export function addManager(name) {
  const config = getConfig()
  const trimmed = (name || '').trim()
  if (!trimmed || config.managers.includes(trimmed)) return config
  config.managers = [...config.managers, trimmed].sort((a, b) => a.localeCompare(b))
  saveConfig(config)
  return config
}

export function removeManager(name) {
  const config = getConfig()
  config.managers = config.managers.filter((m) => m !== name)
  saveConfig(config)
  return config
}
