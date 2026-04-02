import { getIsoWeek, getIsoWeekYear } from '../domain/calendar'

const APPROVALS_KEY = 'ez-roster-allocation-approvals'
const MASTER_ROSTER_KEY = 'ez-roster-master-roster'

export function invalidateApprovedWeek(office, year, week) {
  if (!office || !year || !week) return
  const key = `${office || ''}|${Number(year) || 0}|${Number(week) || 0}`
  try {
    const approvals = JSON.parse(localStorage.getItem(APPROVALS_KEY) || '{}')
    delete approvals[key]
    localStorage.setItem(APPROVALS_KEY, JSON.stringify(approvals))
  } catch {}
  try {
    const rosters = JSON.parse(localStorage.getItem(MASTER_ROSTER_KEY) || '{}')
    delete rosters[key]
    localStorage.setItem(MASTER_ROSTER_KEY, JSON.stringify(rosters))
  } catch {}
}

export function invalidateApprovedWeekByDate(office, dateStr) {
  if (!office || !dateStr) return
  const date = new Date(`${dateStr.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(date.getTime())) return
  invalidateApprovedWeek(office, getIsoWeekYear(date), getIsoWeek(date))
}

export function invalidateAllApprovedWeeks() {
  try {
    localStorage.setItem(APPROVALS_KEY, JSON.stringify({}))
  } catch {}
  try {
    localStorage.setItem(MASTER_ROSTER_KEY, JSON.stringify({}))
  } catch {}
}
