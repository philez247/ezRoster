/**
 * Format a date for phone UI: "ddd dd mm yy HH:MM" (e.g. Wed 04 02 26 14:30).
 * @param {string|Date} date - ISO string or Date
 * @param {string} [timeZone] - IANA timezone (e.g. America/New_York). Omit for local.
 * @returns {string} Formatted string or '—' on error
 */
export function formatDatePhone(date, timeZone) {
  if (!date) return '—'
  try {
    const d = new Date(date)
    if (Number.isNaN(d.getTime())) return '—'
    const opts = {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }
    if (timeZone) opts.timeZone = timeZone
    const parts = new Intl.DateTimeFormat('en-GB', opts).formatToParts(d)
    const get = (type) => parts.find((p) => p.type === type)?.value ?? ''
    return `${get('weekday')} ${get('day')} ${get('month')} ${get('year')} ${get('hour')}:${get('minute')}`
  } catch {
    return '—'
  }
}

/**
 * Format a date for desktop UI: "ddd dd mmm yy HH:MM" (e.g. Wed 05 Feb 26 19:00).
 * @param {string|Date} date - ISO string or Date
 * @param {string} [timeZone] - IANA timezone (e.g. America/New_York). Omit for local.
 * @returns {string} Formatted string or '—' on error
 */
export function formatDateDesktop(date, timeZone) {
  if (!date) return '—'
  try {
    const d = new Date(date)
    if (Number.isNaN(d.getTime())) return '—'
    const opts = {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }
    if (timeZone) opts.timeZone = timeZone
    const parts = new Intl.DateTimeFormat('en-GB', opts).formatToParts(d)
    const get = (type) => parts.find((p) => p.type === type)?.value ?? ''
    return `${get('weekday')} ${get('day')} ${get('month')} ${get('year')} ${get('hour')}:${get('minute')}`
  } catch {
    return '—'
  }
}
