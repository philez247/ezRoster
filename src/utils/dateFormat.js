import {
  formatDesktopDateTime,
  formatPhoneDateTime,
} from '../domain/calendar'

/**
 * Format a date for phone UI: "ddd dd mm yy HH:MM" (e.g. Wed 04 02 26 14:30).
 * @param {string|Date} date - ISO string or Date
 * @param {string} [timeZone] - IANA timezone (e.g. America/New_York). Omit for local.
 * @returns {string} Formatted string or '—' on error
 */
export function formatDatePhone(date, timeZone) {
  const value = formatPhoneDateTime(date, timeZone)
  return value === '-' ? '—' : value
}

/**
 * Format a date for desktop UI: "ddd dd mmm yy HH:MM" (e.g. Wed 05 Feb 26 19:00).
 * @param {string|Date} date - ISO string or Date
 * @param {string} [timeZone] - IANA timezone (e.g. America/New_York). Omit for local.
 * @returns {string} Formatted string or '—' on error
 */
export function formatDateDesktop(date, timeZone) {
  const value = formatDesktopDateTime(date, timeZone)
  return value === '-' ? '—' : value
}
