import {
  ET_TIMEZONE,
  MELBOURNE_TIMEZONE,
  getDateKeyInTimeZone,
} from '../domain/calendar'

export function getEtDate(dateUtc) {
  return getDateKeyInTimeZone(dateUtc, ET_TIMEZONE)
}

export function getMelbourneDate(dateUtc) {
  return getDateKeyInTimeZone(dateUtc, MELBOURNE_TIMEZONE)
}

export function isMelbourneNextDay(dateUtc) {
  const et = getEtDate(dateUtc)
  const melbourne = getMelbourneDate(dateUtc)
  return !!et && !!melbourne && melbourne > et
}

export function getSlateTimezoneNote(dateUtc) {
  return isMelbourneNextDay(dateUtc) ? 'Melbourne +1 day' : 'Same day in Melbourne'
}
