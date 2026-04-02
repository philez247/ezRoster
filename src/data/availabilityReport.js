import {
  getPreferenceRanges,
  getPreferencesByTraderId,
} from './traderPreferences'
import { getTraderDateRequestOverride } from './availabilityRequests'
import { getDayIndexMondayFirst } from '../domain/calendar'
import { getActiveTraders } from '../domain/traders/selectors'

/** True if date (YYYY-MM-DD) falls within range (empty from/to = unbounded). */
function dateInRange(dateStr, fromDate, toDate) {
  const fromOk = !fromDate || fromDate.trim() === '' || fromDate <= dateStr
  const toOk = !toDate || toDate.trim() === '' || toDate >= dateStr
  return fromOk && toOk
}

function scoreRangeSpecificity(range) {
  const hasFrom = !!(range?.fromDate || '').trim()
  const hasTo = !!(range?.toDate || '').trim()
  return (hasFrom ? 1 : 0) + (hasTo ? 1 : 0)
}

/**
 * Pick the most specific applicable range for the date.
 * Priority: bounded range > open range, then latest fromDate.
 */
function pickApplicableRange(ranges, dateStr) {
  const applicable = (ranges || []).filter((r) => dateInRange(dateStr, r.fromDate, r.toDate))
  if (applicable.length === 0) return null
  return [...applicable].sort((a, b) => {
    const spec = scoreRangeSpecificity(b) - scoreRangeSpecificity(a)
    if (spec !== 0) return spec
    const fromCmp = (b.fromDate || '').localeCompare(a.fromDate || '')
    if (fromCmp !== 0) return fromCmp
    return (a.rangeId || '').localeCompare(b.rangeId || '')
  })[0]
}

/**
 * Returns availability report for all traders on a given date (YYYY-MM-DD).
 * Each entry: { traderId, name, alias, status, sport, shiftTiming }
 * status: 'available' | 'unavailable' | 'preferred_in' | 'preferred_off' | 'no_preference'
 */
export function getAvailabilityReport(dateStr) {
  const date = (dateStr || '').trim()
  const dayIndex = date ? getDayIndexMondayFirst(date) : 0
  const traders = getActiveTraders()
  const report = []

  for (const t of traders) {
    const name = [t.bio.lastName, t.bio.firstName].filter(Boolean).join(', ') || t.alias || t.traderId
    const alias = t.alias || ''
    const location = (t.homeLocation || '').trim() || '—'

    const requestOverride = getTraderDateRequestOverride(t.traderId, date)
    if (requestOverride?.type === 'DAY_OFF') {
      report.push({
        traderId: t.traderId,
        name,
        alias,
        location,
        destination: location,
        status: 'unavailable',
        sport: '',
        shiftTiming: '',
        reason: 'Day off',
        source: 'REQUEST',
      })
      continue
    }
    if (requestOverride?.type === 'DAY_IN') {
      report.push({
        traderId: t.traderId,
        name,
        alias,
        location,
        destination: location,
        status: 'available',
        sport: '',
        shiftTiming: 'IN_SHIFT',
        reason: 'Day in',
        source: 'REQUEST',
      })
      continue
    }

    const ranges = getPreferenceRanges(t.traderId)
    let status = 'no_preference'
    let sport = ''
    let shiftTiming = ''
    let reason = 'No preference set'

    const applicableRange = pickApplicableRange(ranges, date)
    if (applicableRange) {
      const prefs = getPreferencesByTraderId(t.traderId, applicableRange.rangeId)
      const dayPref = prefs.find((p) => p.dayIndex === dayIndex) || prefs[dayIndex]
      const pref = dayPref?.preference || 'NO_PREFERENCE'
      sport = dayPref?.sport || ''
      shiftTiming = dayPref?.shiftTiming || ''

      if (pref === 'ON') {
        status = 'available'
        reason = sport ? sport : 'ON'
      } else if (pref === 'PREFERRED_ON') {
        status = 'preferred_in'
        reason = sport ? sport : 'Preferred ON'
      } else if (pref === 'OFF') {
        status = 'unavailable'
        reason = 'OFF'
      } else if (pref === 'PREFERRED_OFF') {
        status = 'preferred_off'
        reason = 'Preferred OFF'
      } else {
        status = 'no_preference'
        reason = 'No preference'
      }
    }

    report.push({
      traderId: t.traderId,
      name,
      alias,
      location,
      destination: location,
      status,
      sport,
      shiftTiming,
      reason,
      source: 'PREFERENCE',
    })
  }

  return report
}
