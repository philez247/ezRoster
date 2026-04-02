import {
  APP_USER_LEVELS,
  normalizePreferenceValue,
  normalizeRequestStatus,
  normalizeRequestType,
  normalizeShiftTiming,
  normalizeSkillLevel,
  normalizeSkillType,
  normalizeSportCode,
  preferenceNeedsShiftAndSport,
} from '../constants/preAllocation'
import { DAY_INDICES, normalizeDateKey } from '../calendar'

export const DEFAULT_TRADER_RANGE_ID = 'default'

function cleanString(value) {
  return String(value || '').trim()
}

function normalizeNumberLike(value) {
  if (value == null || value === '') return ''
  const number = Number(value)
  return Number.isFinite(number) ? number : ''
}

function normalizeBoolean(value, fallback = true) {
  if (typeof value === 'boolean') return value
  return fallback
}

/**
 * Trusted trader shape consumed by selectors and pre-allocation logic.
 * @typedef {object} TraderRecord
 * @property {string} id
 * @property {string} traderId
 * @property {string} name
 * @property {string} alias
 * @property {string} homeLocation
 * @property {boolean} active
 * @property {string} appUserLevel
 * @property {number|string} contractHours
 * @property {number|string} contractDays
 * @property {string} manager
 * @property {{weekendPct:number|string, inShiftPct:number|string}} workload
 * @property {Array<object>} skills
 * @property {{ranges: Array<object>}} preferences
 * @property {{requests: Array<object>}} availability
 * @property {string} notes
 */

export function createEmptyPreferenceDay(dayIndex) {
  return {
    dayIndex,
    preference: 'NO_PREFERENCE',
    sport: '',
    shiftTiming: '',
  }
}

export function createEmptyPreferenceRange(rangeId = DEFAULT_TRADER_RANGE_ID) {
  return {
    rangeId,
    fromDate: '',
    toDate: '',
    days: DAY_INDICES.map((dayIndex) => createEmptyPreferenceDay(dayIndex)),
  }
}

export function normalizeTraderBio(trader = {}) {
  const traderId = cleanString(trader.traderId || trader.id)
  return {
    traderId,
    firstName: cleanString(trader.firstName),
    lastName: cleanString(trader.lastName),
    alias: cleanString(trader.alias),
    location: cleanString(trader.location || trader.homeLocation),
    active: normalizeBoolean(trader.active, true),
    appUserLevel: APP_USER_LEVELS.includes(trader.appUserLevel) ? trader.appUserLevel : 'User',
    contractHours: normalizeNumberLike(trader.contractHours),
    contractDays: normalizeNumberLike(trader.contractDays),
    manager: cleanString(trader.manager),
    weekendPct: normalizeNumberLike(trader.weekendPct),
    inShiftPct: normalizeNumberLike(trader.inShiftPct),
    notes: cleanString(trader.notes),
  }
}

export function normalizeTraderSkill(skill = {}) {
  const sportValue = cleanString(skill.sport)
  return {
    id: cleanString(skill.id),
    traderId: cleanString(skill.traderId),
    sport: sportValue ? normalizeSportCode(skill.sport, { allowOther: true }) : '',
    type: normalizeSkillType(skill.type),
    level: normalizeSkillLevel(skill.level),
  }
}

export function normalizeTraderRequest(request = {}) {
  const fromDate = normalizeDateKey(request.fromDate)
  const toDate = normalizeDateKey(request.toDate || request.fromDate)
  return {
    id: cleanString(request.id),
    traderId: cleanString(request.traderId),
    type: normalizeRequestType(request.type),
    fromDate,
    toDate: toDate || fromDate,
    note: cleanString(request.note),
    status: normalizeRequestStatus(request.status),
  }
}

export function normalizeTraderPreferenceDay(day = {}) {
  const dayIndex = DAY_INDICES.includes(day?.dayIndex) ? day.dayIndex : 0
  const preference = normalizePreferenceValue(day?.preference)
  const needsDetails = preferenceNeedsShiftAndSport(preference)
  return {
    dayIndex,
    preference,
    sport: needsDetails ? normalizeSportCode(day?.sport, { allowOther: false }) : '',
    shiftTiming: needsDetails ? normalizeShiftTiming(day?.shiftTiming) : '',
  }
}

export function normalizeTraderPreferenceRange(range = {}) {
  const base = createEmptyPreferenceRange(cleanString(range?.rangeId) || DEFAULT_TRADER_RANGE_ID)
  const sourceDays = Array.isArray(range?.days) ? range.days : []
  const byDay = new Map(sourceDays.map((day) => [day?.dayIndex, day]))
  return {
    rangeId: base.rangeId,
    fromDate: normalizeDateKey(range?.fromDate),
    toDate: normalizeDateKey(range?.toDate),
    days: base.days.map((day) => normalizeTraderPreferenceDay(byDay.get(day.dayIndex) || day)),
  }
}

export function createBlankTrader() {
  return {
    id: '',
    traderId: '',
    name: '',
    alias: '',
    homeLocation: '',
    active: true,
    appUserLevel: 'User',
    contractHours: '',
    contractDays: '',
    manager: '',
    workload: {
      weekendPct: '',
      inShiftPct: '',
    },
    skills: [],
    preferences: {
      ranges: [createEmptyPreferenceRange()],
    },
    availability: {
      requests: [],
    },
    notes: '',
    bio: normalizeTraderBio({}),
  }
}

export function normalizeTrader(raw = {}) {
  const bio = normalizeTraderBio(raw.bio || raw)
  const skills = Array.isArray(raw.skills) ? raw.skills.map(normalizeTraderSkill) : []
  const ranges = Array.isArray(raw.preferences?.ranges)
    ? raw.preferences.ranges.map(normalizeTraderPreferenceRange)
    : []
  const requests = Array.isArray(raw.requests)
    ? raw.requests.map(normalizeTraderRequest)
    : Array.isArray(raw.availability?.requests)
      ? raw.availability.requests.map(normalizeTraderRequest)
      : []
  const name = [bio.firstName, bio.lastName].filter(Boolean).join(' ').trim() || bio.alias || bio.traderId

  return {
    id: bio.traderId,
    traderId: bio.traderId,
    name,
    alias: bio.alias,
    homeLocation: bio.location,
    active: bio.active,
    appUserLevel: bio.appUserLevel,
    contractHours: bio.contractHours,
    contractDays: bio.contractDays,
    manager: bio.manager,
    workload: {
      weekendPct: bio.weekendPct,
      inShiftPct: bio.inShiftPct,
    },
    skills: skills
      .filter((skill) => skill.traderId === bio.traderId || !skill.traderId)
      .map((skill) => ({ ...skill, traderId: bio.traderId })),
    preferences: {
      ranges,
    },
    availability: {
      requests: requests
        .filter((request) => request.traderId === bio.traderId || !request.traderId)
        .map((request) => ({ ...request, traderId: bio.traderId })),
    },
    notes: bio.notes,
    bio,
  }
}

export function validateTrader(trader, { locations = [], sports = [] } = {}) {
  const normalized = normalizeTrader(trader)
  const errors = []
  const warnings = []
  const locationSet = new Set((locations || []).filter(Boolean))
  const sportSet = new Set((sports || []).filter(Boolean))

  if (!normalized.traderId) errors.push('Missing trader id.')
  if (!normalized.name && !normalized.alias) errors.push('Missing trader name.')
  if (normalized.active && !normalized.homeLocation) warnings.push('Active trader is missing a home location.')
  if (normalized.homeLocation && locationSet.size > 0 && !locationSet.has(normalized.homeLocation)) {
    warnings.push(`Unknown trader location: ${normalized.homeLocation}.`)
  }
  if (normalized.skills.length === 0) warnings.push('No skill records.')
  if (normalized.preferences.ranges.length === 0) warnings.push('No preference ranges.')
  if (normalized.availability.requests.some((request) => request.fromDate && request.toDate && request.toDate < request.fromDate)) {
    errors.push('Availability request has an invalid date range.')
  }
  if (normalized.contractDays !== '' && Number(normalized.contractDays) <= 0) {
    warnings.push('Contract days should be greater than zero.')
  }

  normalized.skills.forEach((skill) => {
    if (!skill.sport) warnings.push(`Skill ${skill.id || '(new)'} is missing a sport.`)
    if (sportSet.size > 0 && skill.sport && !sportSet.has(skill.sport) && skill.sport !== 'OTHER') {
      warnings.push(`Skill ${skill.id || '(new)'} uses unknown sport ${skill.sport}.`)
    }
  })

  normalized.preferences.ranges.forEach((range) => {
    if (range.fromDate && range.toDate && range.toDate < range.fromDate) {
      errors.push(`Preference range ${range.rangeId} has an invalid date range.`)
    }
    range.days.forEach((day) => {
      if (!preferenceNeedsShiftAndSport(day.preference)) return
      if (!day.shiftTiming) warnings.push(`Preference range ${range.rangeId} day ${day.dayIndex} is missing a shift.`)
      if (day.sport && sportSet.size > 0 && !sportSet.has(day.sport)) {
        warnings.push(`Preference range ${range.rangeId} day ${day.dayIndex} uses unknown sport ${day.sport}.`)
      }
    })
  })

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    normalized,
  }
}
