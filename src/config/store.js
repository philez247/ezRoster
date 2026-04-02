import {
  getDefaultSportRoles,
  normalizeSportCode,
  OTHER_SPORT_CODE,
} from '../domain/constants/preAllocation'

const STORAGE_KEY = 'ez-roster-config'

function normalizeRole(role) {
  return (role || '').trim()
}

function normalizeSport(sport) {
  const normalized = normalizeSportCode(sport, { allowOther: true })
  return normalized === OTHER_SPORT_CODE ? 'OTHER' : normalized
}

function defaultRolesForSport(sport) {
  return getDefaultSportRoles(sport)
}

function withSystemRoles(sport, roles) {
  const base = Array.isArray(roles) ? roles.filter(Boolean) : []
  const out = [...base]
  for (const role of defaultRolesForSport(sport)) {
    if (!out.includes(role)) out.push(role)
  }
  return out
}

const defaultConfig = () => ({
  sports: [],
  locations: [],
  managers: [],
  sportRoles: {},
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
      sportRoles: data && typeof data.sportRoles === 'object' && data.sportRoles !== null ? data.sportRoles : {},
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
  const sportKey = normalizeSport(trimmed)
  if (!Array.isArray(config.sportRoles[sportKey]) || config.sportRoles[sportKey].length === 0) {
    config.sportRoles[sportKey] = defaultRolesForSport(sportKey)
  }
  saveConfig(config)
  return config
}

export function removeSport(name) {
  const config = getConfig()
  config.sports = config.sports.filter((s) => s !== name)
  delete config.sportRoles[normalizeSport(name)]
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

export function getRolesForSport(sport) {
  const config = getConfig()
  const key = normalizeSport(sport)
  const list = config.sportRoles[key]
  if (!Array.isArray(list) || list.length === 0) return defaultRolesForSport(key)
  return withSystemRoles(key, list)
}

export function getSportRolesMap() {
  const config = getConfig()
  const map = { ...(config.sportRoles || {}) }
  Object.keys(map).forEach((k) => {
    if (!Array.isArray(map[k]) || map[k].length === 0) map[k] = defaultRolesForSport(k)
    else map[k] = withSystemRoles(k, map[k])
  })
  return map
}

export function addRoleForSport(sport, role) {
  const config = getConfig()
  const sportKey = normalizeSport(sport)
  const roleName = normalizeRole(role)
  if (!sportKey || !roleName) return config
  const current = Array.isArray(config.sportRoles[sportKey]) ? config.sportRoles[sportKey] : defaultRolesForSport(sportKey)
  if (current.some((r) => r.localeCompare(roleName, undefined, { sensitivity: 'accent' }) === 0)) return config
  config.sportRoles[sportKey] = [...current, roleName]
  saveConfig(config)
  return config
}

export function removeRoleForSport(sport, role) {
  const config = getConfig()
  const sportKey = normalizeSport(sport)
  const roleName = normalizeRole(role)
  if (!sportKey || !roleName) return config
  const current = Array.isArray(config.sportRoles[sportKey]) ? config.sportRoles[sportKey] : defaultRolesForSport(sportKey)
  const next = current.filter((r) => r !== roleName)
  config.sportRoles[sportKey] = next.length > 0 ? next : defaultRolesForSport(sportKey)
  saveConfig(config)
  return config
}
