import { loadTraderDb, updateTraderDb } from './traderDb'
import { invalidateAllApprovedWeeks } from './allocationInvalidation'
import {
  DAY_INDICES,
  DAY_LABELS,
} from '../domain/calendar'
import {
  PREFERENCE_OPTIONS,
  SHIFT_TIMING_OPTIONS,
  getPreferenceLabel,
  getShiftTimingLabel,
  normalizePreferenceValue,
  normalizeShiftTiming,
  preferenceNeedsShiftAndSport,
} from '../domain/constants/preAllocation'
import {
  DEFAULT_TRADER_RANGE_ID as DEFAULT_RANGE_ID,
  createEmptyPreferenceRange,
} from '../domain/traders/model'

export function getPreferenceSummary(row = {}) {
  const preference = row.preference || 'NO_PREFERENCE'
  const label = getPreferenceLabel(preference)
  if (!preferenceNeedsShiftAndSport(preference)) return label
  const detailParts = [getShiftTimingLabel(row.shiftTiming), (row.sport || '').trim()].filter(Boolean)
  return detailParts.length ? `${label} - ${detailParts.join(' - ')}` : label
}

function defaultDay(traderId, rangeId, dayIndex) {
  return {
    traderId,
    rangeId,
    dayIndex,
    preference: 'NO_PREFERENCE',
    sport: '',
    shiftTiming: '',
  }
}

function ensureProfile(db, traderId) {
  if (!db.traders[traderId]) {
    db.traders[traderId] = {
      traderId,
      bio: { traderId },
      preferences: { ranges: [] },
      requests: [],
    }
  }
  if (!db.traders[traderId].preferences) db.traders[traderId].preferences = { ranges: [] }
  if (!Array.isArray(db.traders[traderId].preferences.ranges)) {
    db.traders[traderId].preferences.ranges = []
  }
  return db.traders[traderId]
}

function ensureRange(profile, rangeId = DEFAULT_RANGE_ID) {
  const rid = rangeId || DEFAULT_RANGE_ID
  let range = profile.preferences.ranges.find((r) => r.rangeId === rid)
  if (!range) {
    range = createEmptyPreferenceRange(rid)
    profile.preferences.ranges.push(range)
  }
  if (!Array.isArray(range.days)) {
    range.days = createEmptyPreferenceRange(rid).days
  }
  return range
}

function getRange(profile, rangeId = DEFAULT_RANGE_ID) {
  const rid = rangeId || DEFAULT_RANGE_ID
  return profile?.preferences?.ranges?.find((r) => r.rangeId === rid) || null
}

function generateRangeId() {
  return 'RNG-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6)
}

/** Get all date ranges for a trader. Returns [{ rangeId, fromDate, toDate }, ...]. Backward compat: records without rangeId count as DEFAULT_RANGE_ID. */
export function getPreferenceRanges(traderId) {
  const db = loadTraderDb()
  const profile = db.traders[traderId]
  const ranges = profile?.preferences?.ranges || []
  return [...ranges]
    .map((r) => ({ rangeId: r.rangeId || DEFAULT_RANGE_ID, fromDate: r.fromDate || '', toDate: r.toDate || '' }))
    .sort((a, b) => (
      a.rangeId === DEFAULT_RANGE_ID
        ? -1
        : b.rangeId === DEFAULT_RANGE_ID
          ? 1
          : a.rangeId.localeCompare(b.rangeId)
    ))
}

/** Get date constraint for one range. Backward compat: meta without rangeId matches DEFAULT_RANGE_ID. */
export function getPreferenceDateRange(traderId, rangeId = DEFAULT_RANGE_ID) {
  const db = loadTraderDb()
  const profile = db.traders[traderId]
  const range = getRange(profile, rangeId)
  if (!range) return { fromDate: '', toDate: '' }
  return { fromDate: range.fromDate || '', toDate: range.toDate || '' }
}

/** Get all day preferences for a trader and range. Defaults to NO_PREFERENCE. Backward compat: records without rangeId match DEFAULT_RANGE_ID. */
export function getPreferencesByTraderId(traderId, rangeId = DEFAULT_RANGE_ID) {
  const rid = rangeId || DEFAULT_RANGE_ID
  const db = loadTraderDb()
  const profile = db.traders[traderId]
  const range = getRange(profile, rid)
  const byDay = new Map((range?.days || []).map((d) => [d.dayIndex, d]))
  return DAY_INDICES.map((dayIndex) => {
      const found = byDay.get(dayIndex)
      if (!found) return defaultDay(traderId, rid, dayIndex)
      return {
        traderId,
        rangeId: rid,
        dayIndex,
        preference: normalizePreferenceValue(found.preference),
        sport: found.sport || '',
        shiftTiming: normalizeShiftTiming(found.shiftTiming),
      }
  })
}

/** Set preference for one day. */
export function setPreference(traderId, dayIndex, { preference, sport = '', shiftTiming = '' }, rangeId = DEFAULT_RANGE_ID) {
  const rid = rangeId || DEFAULT_RANGE_ID
  updateTraderDb((db) => {
    const profile = ensureProfile(db, traderId)
    const range = ensureRange(profile, rid)
    const idx = range.days.findIndex((d) => d.dayIndex === dayIndex)
    const needsDetails = preferenceNeedsShiftAndSport(preference)
    const next = {
      dayIndex,
      preference: normalizePreferenceValue(preference),
      sport: needsDetails ? (sport || '').trim() : '',
      shiftTiming: needsDetails ? normalizeShiftTiming(shiftTiming) : '',
    }
    if (idx >= 0) range.days[idx] = next
    else range.days.push(next)
  })
  invalidateAllApprovedWeeks()
  return getPreferencesByTraderId(traderId, rid)
}

/** Save all 7 days and date range for a trader and range. */
export function saveAllPreferences(traderId, prefs, dateRange = {}, rangeId = DEFAULT_RANGE_ID) {
  const rid = rangeId || DEFAULT_RANGE_ID
  updateTraderDb((db) => {
    const profile = ensureProfile(db, traderId)
    const range = ensureRange(profile, rid)
    range.fromDate = (dateRange.fromDate || '').trim()
    range.toDate = (dateRange.toDate || '').trim()
    range.days = DAY_INDICES.map((dayIndex) => {
      const p = prefs[dayIndex]
      const preference = normalizePreferenceValue(p?.preference)
      const needsDetails = preferenceNeedsShiftAndSport(preference)
      const sport = needsDetails ? (p?.sport || '').trim() : ''
      const shiftTiming = needsDetails ? normalizeShiftTiming(p?.shiftTiming) : ''
      return { dayIndex, preference, sport, shiftTiming }
    })
  })
  invalidateAllApprovedWeeks()
  return getPreferencesByTraderId(traderId, rid)
}

/** Add a new date range for a trader. Returns the new rangeId. */
export function addPreferenceRange(traderId, fromDate = '', toDate = '') {
  const rangeId = generateRangeId()
  updateTraderDb((db) => {
    const profile = ensureProfile(db, traderId)
    const range = ensureRange(profile, rangeId)
    range.fromDate = (fromDate || '').trim()
    range.toDate = (toDate || '').trim()
  })
  invalidateAllApprovedWeeks()
  return rangeId
}

/** Set all day preferences (all traders, all ranges) to NO_PREFERENCE. Keeps date range meta (fromDate, toDate) unchanged. */
export function resetAllPreferencesToNoPreference() {
  updateTraderDb((db) => {
    Object.values(db.traders).forEach((profile) => {
      const ranges = profile?.preferences?.ranges || []
      ranges.forEach((range) => {
        range.days = createEmptyPreferenceRange(range.rangeId || DEFAULT_RANGE_ID).days
      })
    })
  })
  invalidateAllApprovedWeeks()
}

export {
  DAY_INDICES,
  DAY_LABELS,
  PREFERENCE_OPTIONS,
  SHIFT_TIMING_OPTIONS,
  normalizeShiftTiming,
  preferenceNeedsShiftAndSport,
  getPreferenceLabel,
  getShiftTimingLabel,
}
