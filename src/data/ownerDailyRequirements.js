import { getMasterGames } from './birScheduleMaster'
import { gameKey, getAllAssignments } from './birAssignments'
import { invalidateApprovedWeekByDate } from './allocationInvalidation'
import { getEtDateKey, getWeekDates, normalizeDateKey } from '../domain/calendar'
import {
  normalizeSportCode,
} from '../domain/constants/preAllocation'
import {
  createRequirementRecord,
  normalizeRequirementRecord,
} from '../domain/requirements/model'

const STORAGE_KEY = 'ez-roster-owner-daily-requirements'

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const data = JSON.parse(raw)
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

function saveAll(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.warn('Failed to save owner daily requirements:', error)
  }
}

function normalizeSport(sport) {
  return normalizeSportCode(sport, { allowOther: true })
}

function rowKey(dateStr, location, sport) {
  return `${normalizeDateKey(dateStr)}|${(location || '').trim()}|${normalizeSport(sport)}`
}

function normalize(row) {
  return normalizeRequirementRecord({
    ...createRequirementRecord(),
    ...row,
  })
}

export function getOwnerDailyRequirement(dateStr, location, sport) {
  const all = loadAll()
  return normalize(all[rowKey(dateStr, location, sport)])
}

export function setOwnerDailyRequirement(dateStr, location, sport, updates) {
  const key = rowKey(dateStr, location, sport)
  const all = loadAll()
  const current = normalize(all[key])
  all[key] = normalize({ ...current, ...updates })
  saveAll(all)
  invalidateApprovedWeekByDate(location, dateStr)
  return all[key]
}

export function addRequestedTrader(dateStr, location, sport, traderId) {
  if (!traderId) return getOwnerDailyRequirement(dateStr, location, sport)
  const current = getOwnerDailyRequirement(dateStr, location, sport)
  if (current.requestedTraderIds.includes(traderId)) return current
  return setOwnerDailyRequirement(dateStr, location, sport, {
    requestedTraderIds: [...current.requestedTraderIds, traderId],
  })
}

export function removeRequestedTrader(dateStr, location, sport, traderId) {
  const current = getOwnerDailyRequirement(dateStr, location, sport)
  return setOwnerDailyRequirement(dateStr, location, sport, {
    requestedTraderIds: current.requestedTraderIds.filter((id) => id !== traderId),
  })
}

export function getOwnerCapabilityRequirement(dateStr, location, sport) {
  return getOwnerDailyRequirement(dateStr, location, sport).capabilityLevel
}

export function setOwnerCapabilityRequirement(dateStr, location, sport, capabilityLevel) {
  const normalized = capabilityLevel === 3 ? 3 : capabilityLevel === 2 ? 2 : 1
  return setOwnerDailyRequirement(dateStr, location, sport, { capabilityLevel: normalized })
}

export function getRequiredSportsForWeek(year, week, location) {
  if (!location) return []
  const dates = new Set(getWeekDates(year, week))
  const assignments = getAllAssignments()
  const grouped = new Map()

  for (const game of getMasterGames()) {
    const dateStr = getEtDateKey(game.dateUtc)
    if (!dates.has(dateStr)) continue
    const assignment = assignments[gameKey(game.sport, game.gameId)]
    if (assignment?.location !== location) continue
    const sport = normalizeSport(game.sport)
    const key = `${dateStr}|${sport}`
    const current = grouped.get(key) || { dateStr, sport, gamesCount: 0 }
    current.gamesCount += 1
    grouped.set(key, current)
  }

  return Array.from(grouped.values()).sort((a, b) => {
    const dateCompare = a.dateStr.localeCompare(b.dateStr)
    if (dateCompare !== 0) return dateCompare
    return a.sport.localeCompare(b.sport)
  })
}

export function getRequirementWeekStatus(year, week, location) {
  const days = new Map()
  getWeekDates(year, week).forEach((dateStr) => {
    days.set(dateStr, { dateStr, sports: [] })
  })

  getRequiredSportsForWeek(year, week, location).forEach((entry) => {
    const requirement = getOwnerDailyRequirement(entry.dateStr, location, entry.sport)
    const row = {
      sport: entry.sport,
      gamesCount: entry.gamesCount,
      requirement,
      submitted: !!requirement.confirmedAt,
    }
    days.get(entry.dateStr)?.sports.push(row)
  })

  const dayList = Array.from(days.values()).map((day) => ({
    ...day,
    sports: [...day.sports].sort((a, b) => a.sport.localeCompare(b.sport)),
  }))

  const missing = dayList.flatMap((day) =>
    day.sports
      .filter((row) => !row.submitted)
      .map((row) => ({ dateStr: day.dateStr, sport: row.sport }))
  )

  return {
    days: dayList,
    missing,
    allSubmitted: missing.length === 0,
  }
}
