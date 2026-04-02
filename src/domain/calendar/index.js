export const ISO_DATE_FORMAT = 'YYYY-MM-DD'
export const ISO_WEEK_KEY_FORMAT = 'YYYY-Www'
export const ET_TIMEZONE = 'America/New_York'
export const MELBOURNE_TIMEZONE = 'Australia/Melbourne'
export const DUBLIN_TIMEZONE = 'Europe/Dublin'
export const DAY_INDICES = [0, 1, 2, 3, 4, 5, 6]
export const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function toDate(value) {
  if (value instanceof Date) return new Date(value.getTime())
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00`)
  }
  return new Date(value)
}

function pad(value) {
  return String(value).padStart(2, '0')
}

export function normalizeDateKey(value) {
  if (!value) return ''
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }
  const date = toDate(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function toCompactDateKey(value) {
  const normalized = normalizeDateKey(value)
  return normalized ? normalized.replace(/-/g, '') : ''
}

export function getIsoWeek(value) {
  const date = toDate(value)
  if (Number.isNaN(date.getTime())) return 0
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 4 - (date.getDay() || 7))
  const yearStart = new Date(date.getFullYear(), 0, 1)
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7)
}

export function getIsoWeekYear(value) {
  const date = toDate(value)
  if (Number.isNaN(date.getTime())) return 0
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 4 - (date.getDay() || 7))
  return date.getFullYear()
}

export function getWeekKey(year, week) {
  const safeYear = Number(year) || 0
  const safeWeek = Number(week) || 0
  return `${safeYear}-W${pad(safeWeek)}`
}

export function getWeekStartDate(year, week) {
  const jan4 = new Date(Number(year) || 0, 0, 4)
  const dayOfWeek = jan4.getDay() || 7
  const mondayJan4 = new Date(jan4)
  mondayJan4.setDate(jan4.getDate() - dayOfWeek + 1)
  const weekStart = new Date(mondayJan4)
  weekStart.setDate(mondayJan4.getDate() + ((Number(week) || 0) - 1) * 7)
  return normalizeDateKey(weekStart)
}

export function getWeekEndDate(year, week) {
  const startDate = getWeekStartDate(year, week)
  if (!startDate) return ''
  const date = toDate(startDate)
  date.setDate(date.getDate() + 6)
  return normalizeDateKey(date)
}

export function getWeekDates(year, week) {
  const startDate = getWeekStartDate(year, week)
  if (!startDate) return []
  const date = toDate(startDate)
  return DAY_INDICES.map((offset) => {
    const next = new Date(date)
    next.setDate(date.getDate() + offset)
    return normalizeDateKey(next)
  })
}

export function getDateKeyInTimeZone(dateUtc, timeZone) {
  if (!dateUtc) return ''
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(dateUtc))
  } catch {
    return ''
  }
}

export function getEtDateKey(dateUtc) {
  return getDateKeyInTimeZone(dateUtc, ET_TIMEZONE)
}

export function getMelbourneDateKey(dateUtc) {
  return getDateKeyInTimeZone(dateUtc, MELBOURNE_TIMEZONE)
}

export function getDayIndexMondayFirst(dateStr) {
  const date = toDate(dateStr)
  if (Number.isNaN(date.getTime())) return 0
  const jsDay = date.getDay()
  return jsDay === 0 ? 6 : jsDay - 1
}

export function formatShortDayLabel(dateStr) {
  const normalized = normalizeDateKey(dateStr)
  if (!normalized) return dateStr || ''
  try {
    return new Date(`${normalized}T12:00:00`).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  } catch {
    return normalized
  }
}

export function formatFullDateEt(dateStr) {
  const normalized = normalizeDateKey(dateStr)
  if (!normalized) return dateStr || ''
  try {
    return `${new Date(`${normalized}T12:00:00`).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: ET_TIMEZONE,
    })} ET`
  } catch {
    return normalized
  }
}

export function formatDateTime(value, options = {}) {
  if (!value) return '-'
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'
    const {
      timeZone,
      month = 'short',
      day = '2-digit',
      year = 'numeric',
      hour = '2-digit',
      minute = '2-digit',
      hour12 = false,
    } = options
    return new Intl.DateTimeFormat('en-GB', {
      timeZone,
      month,
      day,
      year,
      hour,
      minute,
      hour12,
    }).format(date)
  } catch {
    return String(value)
  }
}

export function formatCompactDateTime(value, timeZone) {
  if (!value) return '-'
  try {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    }).format(new Date(value))
  } catch {
    return '-'
  }
}

export function todayDateKey(timeZone) {
  if (!timeZone) return normalizeDateKey(new Date())
  return getDateKeyInTimeZone(new Date().toISOString(), timeZone)
}

export function formatPhoneDateTime(value, timeZone) {
  if (!value) return '-'
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'
    const parts = new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    }).formatToParts(date)
    const get = (type) => parts.find((part) => part.type === type)?.value ?? ''
    return `${get('weekday')} ${get('day')} ${get('month')} ${get('year')} ${get('hour')}:${get('minute')}`
  } catch {
    return '-'
  }
}

export function formatDesktopDateTime(value, timeZone) {
  if (!value) return '-'
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'
    const parts = new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    }).formatToParts(date)
    const get = (type) => parts.find((part) => part.type === type)?.value ?? ''
    return `${get('weekday')} ${get('day')} ${get('month')} ${get('year')} ${get('hour')}:${get('minute')}`
  } catch {
    return '-'
  }
}
