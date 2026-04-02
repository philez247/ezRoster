export const OTHER_SPORT_CODE = 'OTHER'

export const SPORT_CODES = ['NBA', 'NFL', 'NHL', 'WNBA', 'MLB', 'NCAAM', 'CFB']
export const SPORT_OPTIONS = ['', ...SPORT_CODES]
export const SPORT_ALIASES = {
  CBB: 'NCAAM',
  NCAAB: 'NCAAM',
}
export const KNOWN_SPORTS = new Set(SPORT_CODES)

export const ASSIGNMENT_LOCATIONS = ['Dublin', 'Melbourne', 'New Jersey', 'Combo']
export const OFFICE_LOCATIONS = ASSIGNMENT_LOCATIONS.filter((location) => location !== 'Combo')

export const APP_USER_LEVELS = ['User', 'Owner', 'Manager', 'Admin']

export const SKILL_TYPES = ['primary', 'secondary']
export const SKILL_LEVELS = [1, 2, 3]

export const SHIFT_TIMING_OPTIONS = [
  { value: 'EARLY', label: 'Early' },
  { value: 'LATE', label: 'Late' },
  { value: 'IN_SHIFT', label: 'IN Shift' },
]
export const SHIFT_TIMING_VALUES = SHIFT_TIMING_OPTIONS.map((option) => option.value)

export const DEFAULT_REQUIREMENT_SHIFT = 'IN_SHIFT'

export const PREFERENCE_OPTIONS = [
  { value: 'NO_PREFERENCE', label: 'No Preference' },
  { value: 'OFF', label: 'OFF' },
  { value: 'PREFERRED_OFF', label: 'Preferred OFF' },
  { value: 'PREFERRED_ON', label: 'Preferred ON' },
  { value: 'ON', label: 'ON' },
]
export const PREFERENCE_VALUES = PREFERENCE_OPTIONS.map((option) => option.value)

export const REQUEST_TYPES = [
  { value: 'DAY_OFF', label: 'Day Off' },
  { value: 'DAY_IN', label: 'Day In' },
]
export const REQUEST_TYPE_VALUES = REQUEST_TYPES.map((option) => option.value)

export const REQUEST_STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]
export const REQUEST_STATUS_VALUES = REQUEST_STATUSES.map((option) => option.value)

export const AVAILABILITY_STATUS_ORDER = [
  'no_preference',
  'available',
  'preferred_in',
  'unavailable',
  'preferred_off',
]
export const AVAILABILITY_STATUS_LABELS = {
  no_preference: 'No Preference',
  available: 'In',
  preferred_in: 'Preferred In',
  unavailable: 'Off',
  preferred_off: 'Preferred Off',
}
export const AVAILABILITY_STATUS_PRIORITY = {
  preferred_in: 4,
  available: 3,
  no_preference: 2,
  preferred_off: 1,
  unavailable: 0,
}

export const DEMAND_LEVELS = ['Skeleton', 'Quiet', 'Medium', 'Busy']
export const DEMAND_LEVEL_ORDER = {
  Skeleton: 0,
  Quiet: 1,
  Medium: 2,
  Busy: 3,
}

export const CAPABILITY_LEVELS = [1, 2, 3]

export function normalizeSportCode(value, { allowOther = true } = {}) {
  const upper = String(value || '').trim().toUpperCase()
  const normalized = SPORT_ALIASES[upper] || upper
  if (!normalized) return allowOther ? OTHER_SPORT_CODE : ''
  if (KNOWN_SPORTS.has(normalized)) return normalized
  return allowOther ? OTHER_SPORT_CODE : ''
}

export function normalizeShiftTiming(value) {
  const normalized = String(value || '').trim().toUpperCase().replace(/\s+/g, '_')
  if (!normalized) return ''
  if (normalized === 'FULL') return 'IN_SHIFT'
  return SHIFT_TIMING_VALUES.includes(normalized) ? normalized : ''
}

export function getShiftTimingLabel(value) {
  const normalized = normalizeShiftTiming(value)
  return SHIFT_TIMING_OPTIONS.find((option) => option.value === normalized)?.label || ''
}

export function normalizePreferenceValue(value) {
  const normalized = String(value || '').trim().toUpperCase().replace(/\s+/g, '_')
  return PREFERENCE_VALUES.includes(normalized) ? normalized : 'NO_PREFERENCE'
}

export function getPreferenceLabel(value) {
  const normalized = normalizePreferenceValue(value)
  return PREFERENCE_OPTIONS.find((option) => option.value === normalized)?.label || 'No Preference'
}

export function preferenceNeedsShiftAndSport(value) {
  const normalized = normalizePreferenceValue(value)
  return normalized === 'ON' || normalized === 'PREFERRED_ON'
}

export function normalizeRequestType(value) {
  return value === 'DAY_IN' ? 'DAY_IN' : 'DAY_OFF'
}

export function normalizeRequestStatus(value) {
  return REQUEST_STATUS_VALUES.includes(value) ? value : 'PENDING'
}

export function getRequestTypeLabel(value) {
  return REQUEST_TYPES.find((option) => option.value === value)?.label || 'Day Off'
}

export function getRequestStatusLabel(value) {
  return REQUEST_STATUSES.find((option) => option.value === value)?.label || 'Pending'
}

export function normalizeDemandLevel(value) {
  return DEMAND_LEVELS.includes(value) ? value : 'Medium'
}

export function normalizeCapabilityLevel(value) {
  return value === 3 ? 3 : value === 2 ? 2 : 1
}

export function normalizeSkillType(value) {
  return value === 'secondary' ? 'secondary' : 'primary'
}

export function normalizeSkillLevel(value) {
  return value === 3 ? 3 : value === 2 ? 2 : 1
}

export function getDefaultSportRoles(sport) {
  const sportKey = normalizeSportCode(sport) || OTHER_SPORT_CODE
  const sportShift = sportKey === OTHER_SPORT_CODE ? 'General Shift' : `${sportKey} Shift`
  return [sportShift, 'IN Shift', 'Other']
}
