const STORAGE_KEY = 'ez-roster-trader-preferences'
const DEFAULT_RANGE_ID = 'default'

/** Day indices: 0 = Monday, 1 = Tuesday, ... 6 = Sunday */
export const DAY_INDICES = [0, 1, 2, 3, 4, 5, 6]
export const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export const PREFERENCE_OPTIONS = [
  { value: 'NO_PREFERENCE', label: 'No Preference' },
  { value: 'OFF', label: 'OFF' },
  { value: 'PREFERRED_OFF', label: 'Preferred OFF' },
  { value: 'PREFERRED_ON', label: 'Preferred ON' },
  { value: 'ON', label: 'ON' },
]

export const SHIFT_TIMING_OPTIONS = [
  { value: 'EARLY', label: 'Early' },
  { value: 'LATE', label: 'Late' },
  { value: 'FULL', label: 'Full' },
]

export function getPreferenceLabel(value) {
  if (value === 'NO_PREFERENCE' || value == null || value === '') return 'No Preference'
  const opt = PREFERENCE_OPTIONS.find((o) => o.value === value)
  return opt ? opt.label : value
}

export function getShiftTimingLabel(value) {
  const opt = SHIFT_TIMING_OPTIONS.find((o) => o.value === value)
  return opt ? opt.label : value || 'Full'
}

function getRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function save(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch (e) {
    console.warn('Failed to save trader preferences:', e)
  }
}

function generateRangeId() {
  return 'RNG-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6)
}

/** Get all date ranges for a trader. Returns [{ rangeId, fromDate, toDate }, ...]. Backward compat: records without rangeId count as DEFAULT_RANGE_ID. */
export function getPreferenceRanges(traderId) {
  const list = getRaw()
  const metas = list.filter(
    (p) => p.traderId === traderId && (p.dayIndex === -1 || p.dayIndex == null)
  )
  if (metas.length === 0) return []
  const byRange = {}
  metas.forEach((m) => {
    const rid = m.rangeId ?? DEFAULT_RANGE_ID
    if (!byRange[rid]) byRange[rid] = { rangeId: rid, fromDate: m.fromDate || '', toDate: m.toDate || '' }
  })
  return Object.values(byRange).sort((a, b) => (a.rangeId === DEFAULT_RANGE_ID ? -1 : b.rangeId === DEFAULT_RANGE_ID ? 1 : a.rangeId.localeCompare(b.rangeId)))
}

/** Get date constraint for one range. Backward compat: meta without rangeId matches DEFAULT_RANGE_ID. */
export function getPreferenceDateRange(traderId, rangeId = DEFAULT_RANGE_ID) {
  const list = getRaw()
  const rid = rangeId || DEFAULT_RANGE_ID
  const meta = list.find(
    (p) => p.traderId === traderId && (p.dayIndex === -1 || p.dayIndex == null) && (p.rangeId || DEFAULT_RANGE_ID) === rid
  )
  if (!meta) return { fromDate: '', toDate: '' }
  return { fromDate: meta.fromDate || '', toDate: meta.toDate || '' }
}

/** Get all day preferences for a trader and range. Defaults to NO_PREFERENCE. Backward compat: records without rangeId match DEFAULT_RANGE_ID. */
export function getPreferencesByTraderId(traderId, rangeId = DEFAULT_RANGE_ID) {
  const rid = rangeId || DEFAULT_RANGE_ID
  const list = getRaw().filter(
    (p) => p.traderId === traderId && p.dayIndex >= 0 && p.dayIndex <= 6 && (p.rangeId || DEFAULT_RANGE_ID) === rid
  )
  return DAY_INDICES.map((dayIndex) => {
    const found = list.find((p) => p.dayIndex === dayIndex)
    if (found) return { ...found }
    return {
      traderId,
      rangeId: rid,
      dayIndex,
      preference: 'NO_PREFERENCE',
      sport: '',
      shiftTiming: 'FULL',
    }
  })
}

/** Set preference for one day. */
export function setPreference(traderId, dayIndex, { preference, sport = '', shiftTiming = 'FULL' }, rangeId = DEFAULT_RANGE_ID) {
  const list = getRaw()
  const rid = rangeId || DEFAULT_RANGE_ID
  const idx = list.findIndex((p) => p.traderId === traderId && p.dayIndex === dayIndex && (p.rangeId || DEFAULT_RANGE_ID) === rid)
  const normalized = {
    traderId,
    rangeId: rid,
    dayIndex,
    preference: preference || 'NO_PREFERENCE',
    sport: (preference === 'ON' || preference === 'PREFERRED_ON') ? (sport || '').trim() : '',
    shiftTiming: shiftTiming || 'FULL',
  }
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...normalized }
  } else {
    list.push(normalized)
  }
  save(list)
  return getPreferencesByTraderId(traderId, rid)
}

/** Save all 7 days and date range for a trader and range. */
export function saveAllPreferences(traderId, prefs, dateRange = {}, rangeId = DEFAULT_RANGE_ID) {
  const rid = rangeId || DEFAULT_RANGE_ID
  const list = getRaw().filter((p) => p.traderId !== traderId || (p.rangeId || DEFAULT_RANGE_ID) !== rid)
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const p = prefs[dayIndex]
    const preference = p?.preference ?? 'NO_PREFERENCE'
    const sport = (preference === 'ON' || preference === 'PREFERRED_ON') ? (p?.sport || '').trim() : ''
    const shiftTiming = p?.shiftTiming || 'FULL'
    list.push({ traderId, rangeId: rid, dayIndex, preference, sport, shiftTiming })
  }
  list.push({
    traderId,
    rangeId: rid,
    dayIndex: -1,
    fromDate: (dateRange.fromDate || '').trim(),
    toDate: (dateRange.toDate || '').trim(),
  })
  save(list)
  return getPreferencesByTraderId(traderId, rid)
}

/** Add a new date range for a trader. Returns the new rangeId. */
export function addPreferenceRange(traderId, fromDate = '', toDate = '') {
  const rangeId = generateRangeId()
  const prefs = DAY_INDICES.map((d) => ({
    dayIndex: d,
    preference: 'NO_PREFERENCE',
    sport: '',
    shiftTiming: 'FULL',
  }))
  saveAllPreferences(traderId, prefs, { fromDate: (fromDate || '').trim(), toDate: (toDate || '').trim() }, rangeId)
  return rangeId
}

/** Set all day preferences (all traders, all ranges) to NO_PREFERENCE. Keeps date range meta (fromDate, toDate) unchanged. */
export function resetAllPreferencesToNoPreference() {
  const list = getRaw()
  const updated = list.map((p) => {
    if (p.dayIndex >= 0 && p.dayIndex <= 6) {
      return { ...p, preference: 'NO_PREFERENCE', sport: '', shiftTiming: 'FULL' }
    }
    return p
  })
  save(updated)
}
