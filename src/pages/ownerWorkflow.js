import {
  ASSIGNMENT_LOCATIONS,
  AVAILABILITY_STATUS_LABELS,
  AVAILABILITY_STATUS_ORDER,
  DEMAND_LEVELS,
  SPORT_OPTIONS,
} from '../domain/constants/preAllocation'
import {
  formatCompactDateTime,
  formatFullDateEt,
  formatShortDayLabel,
  getEtDateKey,
  getIsoWeek,
  getWeekDates,
  getWeekEndDate,
  getWeekStartDate,
  MELBOURNE_TIMEZONE,
  ET_TIMEZONE,
} from '../domain/calendar'

export const SPORTS = SPORT_OPTIONS
export const DAY_LEVELS = DEMAND_LEVELS
export const STATUS_ORDER = AVAILABILITY_STATUS_ORDER
export const STATUS_LABELS = AVAILABILITY_STATUS_LABELS
export const LOCATION_OPTIONS = ASSIGNMENT_LOCATIONS.filter((location) => location !== 'Combo')

export function getISOWeek(value) {
  return getIsoWeek(value)
}

export function weekRange(year, weekNum) {
  return {
    start: (getWeekStartDate(year, weekNum) || '').replace(/-/g, ''),
    end: (getWeekEndDate(year, weekNum) || '').replace(/-/g, ''),
  }
}

export function getSevenDaysForWeek(year, weekNum) {
  return getWeekDates(year, weekNum)
}

export function gameDateEt(dateUtc) {
  return getEtDateKey(dateUtc)
}

export function formatDayLabel(dateStr) {
  return formatShortDayLabel(dateStr)
}

export { formatFullDateEt }

export function formatDateEtCompact(dateUtc) {
  return formatCompactDateTime(dateUtc, ET_TIMEZONE)
}

export function formatDateMelbourneCompact(dateUtc) {
  return formatCompactDateTime(dateUtc, MELBOURNE_TIMEZONE)
}

export function eventName(game) {
  return `${game?.awayTeam?.name || 'Away'} @ ${game?.homeTeam?.name || 'Home'}`
}
