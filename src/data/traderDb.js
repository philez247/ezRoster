import {
  createEmptyPreferenceRange,
  normalizeTraderBio,
  normalizeTraderPreferenceRange,
  normalizeTraderRequest,
} from '../domain/traders/model'

const STORAGE_KEY = 'ez-roster-trader-db-v1'

const LEGACY_TRADERS_KEY = 'ez-roster-traders'
const LEGACY_PREFERENCES_KEY = 'ez-roster-trader-preferences'
const LEGACY_REQUESTS_KEY = 'ez-roster-availability-requests'
const DEFAULT_RANGE_ID = 'default'

function createEmptyDb() {
  return {
    version: 1,
    traders: {},
  }
}

function normalizeRange(range = {}) {
  return normalizeTraderPreferenceRange({
    ...createEmptyPreferenceRange(range.rangeId || DEFAULT_RANGE_ID),
    ...range,
  })
}

function normalizeProfile(profile = {}) {
  const bio = normalizeTraderBio(profile.bio || {})
  const ranges = Array.isArray(profile.preferences?.ranges)
    ? profile.preferences.ranges.map(normalizeRange)
    : []
  const requests = Array.isArray(profile.requests)
    ? profile.requests.map(normalizeTraderRequest)
    : []
  return {
    traderId: profile.traderId || bio.traderId || '',
    bio: { ...bio, traderId: profile.traderId || bio.traderId || '' },
    preferences: { ranges },
    requests,
  }
}

function normalizeDb(db = {}) {
  const traders = {}
  const input = db?.traders && typeof db.traders === 'object' ? db.traders : {}
  Object.entries(input).forEach(([traderId, profile]) => {
    const normalized = normalizeProfile({ ...profile, traderId })
    if (normalized.traderId) traders[normalized.traderId] = normalized
  })
  return {
    version: 1,
    traders,
  }
}

function parseJsonStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const data = JSON.parse(raw)
    return data ?? fallback
  } catch {
    return fallback
  }
}

function saveDb(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch (e) {
    console.warn('Failed to save trader DB:', e)
  }
}

export function replaceTraderDb(nextDb) {
  saveDb(normalizeDb(nextDb))
}

function ensureRange(profile, rangeId = DEFAULT_RANGE_ID) {
  if (!profile.preferences) profile.preferences = { ranges: [] }
  if (!Array.isArray(profile.preferences.ranges)) profile.preferences.ranges = []
  const rid = rangeId || DEFAULT_RANGE_ID
  const existing = profile.preferences.ranges.find((r) => r.rangeId === rid)
  if (existing) return existing
  const created = createEmptyPreferenceRange(rid)
  profile.preferences.ranges.push(created)
  return created
}

function ensureProfile(db, traderId) {
  if (!db.traders[traderId]) {
    db.traders[traderId] = normalizeProfile({
      traderId,
      bio: { traderId },
      preferences: { ranges: [] },
      requests: [],
    })
  }
  return db.traders[traderId]
}

function migrateLegacyDb() {
  const db = createEmptyDb()
  const traders = parseJsonStorage(LEGACY_TRADERS_KEY, [])
  const preferences = parseJsonStorage(LEGACY_PREFERENCES_KEY, [])
  const requests = parseJsonStorage(LEGACY_REQUESTS_KEY, [])

  if (!Array.isArray(traders) && !Array.isArray(preferences) && !Array.isArray(requests)) {
    return db
  }

  if (Array.isArray(traders)) {
    traders.forEach((trader) => {
      if (!trader?.traderId) return
      const profile = ensureProfile(db, trader.traderId)
      profile.bio = normalizeBio(trader)
    })
  }

  if (Array.isArray(preferences)) {
    const metaByTraderRange = {}
    preferences.forEach((entry) => {
      const traderId = entry?.traderId
      if (!traderId) return
      const profile = ensureProfile(db, traderId)
      const rangeId = entry?.rangeId || DEFAULT_RANGE_ID
      const range = ensureRange(profile, rangeId)
      if (entry.dayIndex === -1 || entry.dayIndex == null) {
        metaByTraderRange[`${traderId}::${rangeId}`] = {
          fromDate: entry.fromDate || '',
          toDate: entry.toDate || '',
        }
        return
      }
      if (entry.dayIndex < 0 || entry.dayIndex > 6) return
      const idx = range.days.findIndex((d) => d.dayIndex === entry.dayIndex)
      if (idx < 0) return
      range.days[idx] = {
        dayIndex: entry.dayIndex,
        preference: entry.preference || 'NO_PREFERENCE',
        sport: entry.sport || '',
        shiftTiming: entry.shiftTiming,
      }
    })

    Object.entries(metaByTraderRange).forEach(([key, meta]) => {
      const [traderId, rangeId] = key.split('::')
      const profile = ensureProfile(db, traderId)
      const range = ensureRange(profile, rangeId)
      range.fromDate = meta.fromDate
      range.toDate = meta.toDate
    })
  }

  if (Array.isArray(requests)) {
    requests.forEach((req) => {
      const traderId = req?.traderId
      if (!traderId) return
      const profile = ensureProfile(db, traderId)
      profile.requests.push(normalizeTraderRequest(req))
    })
  }

  return normalizeDb(db)
}

export function loadTraderDb() {
  const existing = parseJsonStorage(STORAGE_KEY, null)
  if (existing) return normalizeDb(existing)
  const migrated = migrateLegacyDb()
  saveDb(migrated)
  return migrated
}

export function updateTraderDb(mutator) {
  const db = loadTraderDb()
  const result = mutator(db)
  const normalized = normalizeDb(db)
  saveDb(normalized)
  return result
}
