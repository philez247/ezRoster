import {
  DEFAULT_REQUIREMENT_SHIFT,
  normalizeCapabilityLevel,
  normalizeDemandLevel,
  normalizeShiftTiming,
  normalizeSportCode,
} from '../constants/preAllocation'
import {
  getIsoWeek,
  getIsoWeekYear,
  getWeekKey,
  normalizeDateKey,
} from '../calendar'

function cleanString(value) {
  return String(value || '').trim()
}

function normalizeCount(value) {
  return Math.max(0, Number(value) || 0)
}

/**
 * Trusted requirement input consumed before allocation.
 * @typedef {object} RequirementInput
 * @property {string} id
 * @property {string} date
 * @property {string} weekKey
 * @property {string} location
 * @property {string} sport
 * @property {string} shift
 * @property {number} requiredCount
 * @property {string} priority
 * @property {string} source
 * @property {string} notes
 * @property {number} capabilityLevel
 * @property {string[]} requestedTraderIds
 * @property {string} confirmedAt
 * @property {number} gamesCount
 */

export function createRequirementRecord() {
  return {
    tradersNeeded: 0,
    demandLevel: 'Medium',
    requestedTraderIds: [],
    capabilityLevel: 1,
    confirmedAt: '',
  }
}

export function normalizeRequirementRecord(row = {}) {
  return {
    tradersNeeded: normalizeCount(row?.tradersNeeded ?? row?.requiredCount),
    demandLevel: normalizeDemandLevel(row?.demandLevel ?? row?.priority),
    requestedTraderIds: Array.isArray(row?.requestedTraderIds)
      ? [...new Set(row.requestedTraderIds.map((value) => cleanString(value)).filter(Boolean))]
      : [],
    capabilityLevel: normalizeCapabilityLevel(row?.capabilityLevel),
    confirmedAt: cleanString(row?.confirmedAt),
  }
}

export function getRequirementId({ date, location, sport, shift = DEFAULT_REQUIREMENT_SHIFT } = {}) {
  const normalizedDate = normalizeDateKey(date)
  const normalizedLocation = cleanString(location)
  const normalizedSport = normalizeSportCode(sport, { allowOther: true })
  const normalizedShift = normalizeShiftTiming(shift) || DEFAULT_REQUIREMENT_SHIFT
  return [normalizedDate, normalizedLocation, normalizedSport, normalizedShift].join('|')
}

export function normalizeRequirement(raw = {}) {
  const date = normalizeDateKey(raw.date || raw.dateStr)
  const weekKey = cleanString(raw.weekKey) || (date ? getWeekKey(getIsoWeekYear(date), getIsoWeek(date)) : '')
  const shift = normalizeShiftTiming(raw.shift) || DEFAULT_REQUIREMENT_SHIFT
  const requirement = normalizeRequirementRecord(raw.requirement || raw)
  const sportValue = cleanString(raw.sport)

  return {
    id: cleanString(raw.id) || getRequirementId({
      date,
      location: raw.location,
      sport: raw.sport,
      shift,
    }),
    date,
    weekKey,
    location: cleanString(raw.location),
    sport: sportValue ? normalizeSportCode(raw.sport, { allowOther: true }) : '',
    shift,
    requiredCount: requirement.tradersNeeded,
    priority: requirement.demandLevel,
    source: cleanString(raw.source) || 'OWNER_REQUIREMENT',
    notes: cleanString(raw.notes),
    capabilityLevel: requirement.capabilityLevel,
    requestedTraderIds: requirement.requestedTraderIds,
    confirmedAt: requirement.confirmedAt,
    gamesCount: normalizeCount(raw.gamesCount),
  }
}

export function validateRequirement(requirement, { locations = [], sports = [] } = {}) {
  const normalized = normalizeRequirement(requirement)
  const errors = []
  const warnings = []
  const locationSet = new Set((locations || []).filter(Boolean))
  const sportSet = new Set((sports || []).filter(Boolean))

  if (!normalized.date) errors.push('Missing requirement date.')
  if (!normalized.location) errors.push('Missing requirement location.')
  if (!normalized.sport) errors.push('Missing requirement sport.')
  if (normalized.location && locationSet.size > 0 && !locationSet.has(normalized.location)) {
    warnings.push(`Unknown requirement location: ${normalized.location}.`)
  }
  if (normalized.sport && sportSet.size > 0 && !sportSet.has(normalized.sport) && normalized.sport !== 'OTHER') {
    warnings.push(`Unknown requirement sport: ${normalized.sport}.`)
  }
  if (normalized.confirmedAt && Number.isNaN(new Date(normalized.confirmedAt).getTime())) {
    warnings.push('Requirement confirmation timestamp is invalid.')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    normalized,
  }
}
