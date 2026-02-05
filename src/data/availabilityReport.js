import { getTraders } from './traders'
import {
  getPreferenceRanges,
  getPreferenceDateRange,
  getPreferencesByTraderId,
} from './traderPreferences'
import { isTraderOffOnDate } from './availabilityRequests'

/** Day of week from YYYY-MM-DD: 0 = Monday, 6 = Sunday. */
function getDayIndex(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const jsDay = d.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  return jsDay === 0 ? 6 : jsDay - 1
}

/** True if date (YYYY-MM-DD) falls within range (empty from/to = unbounded). */
function dateInRange(dateStr, fromDate, toDate) {
  const fromOk = !fromDate || fromDate.trim() === '' || fromDate <= dateStr
  const toOk = !toDate || toDate.trim() === '' || toDate >= dateStr
  return fromOk && toOk
}

/**
 * Returns availability report for all traders on a given date (YYYY-MM-DD).
 * Each entry: { traderId, name, alias, status, sport, shiftTiming }
 * status: 'available' | 'unavailable' | 'preferred_in' | 'preferred_off' | 'no_preference'
 */
export function getAvailabilityReport(dateStr) {
  const date = (dateStr || '').trim()
  const dayIndex = date ? getDayIndex(date) : 0
  const traders = getTraders()
  const report = []

  for (const t of traders) {
    const name = [t.lastName, t.firstName].filter(Boolean).join(', ') || t.alias || t.traderId
    const alias = t.alias || ''
    const location = (t.location || '').trim() || '—'

    if (isTraderOffOnDate(t.traderId, date)) {
      report.push({
        traderId: t.traderId,
        name,
        alias,
        location,
        status: 'unavailable',
        sport: '',
        shiftTiming: '',
        reason: 'Day off',
        source: 'REQUEST',
      })
      continue
    }

    const ranges = getPreferenceRanges(t.traderId)
    let status = 'no_preference'
    let sport = ''
    let shiftTiming = ''
    let reason = 'No preference set'

    const applicableRange = ranges.find((r) =>
      dateInRange(date, r.fromDate, r.toDate)
    )
    if (applicableRange) {
      const prefs = getPreferencesByTraderId(t.traderId, applicableRange.rangeId)
      const dayPref = prefs.find((p) => p.dayIndex === dayIndex) || prefs[dayIndex]
      const pref = dayPref?.preference || 'NO_PREFERENCE'
      sport = dayPref?.sport || ''
      shiftTiming = dayPref?.shiftTiming || 'FULL'

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
      status,
      sport,
      shiftTiming,
      reason,
      source: 'PREFERENCE',
    })
  }

  return report
}
