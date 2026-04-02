import { getMasterGames } from './birScheduleMaster'
import { gameKey, getAssignment } from './birAssignments'
import { getAvailabilityReport } from './availabilityReport'
import {
  getEtDateKey,
  getIsoWeek,
  getWeekDates,
} from '../domain/calendar'
import { normalizeSportCode } from '../domain/constants/preAllocation'

const STORAGE_KEY = 'ez-roster-master-roster'

export const ROSTER_STATUS = {
  EMPTY: 'Empty',
  ALLOCATED: 'Allocated',
  ASSIGNED: 'Assigned',
}

function key(office, year, week) {
  return `${office || ''}|${Number(year) || 0}|${Number(week) || 0}`
}

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
  } catch (e) {
    console.warn('Failed to save master roster:', e)
  }
}

function weekOfficeGames(office, year, week) {
  const days = new Set(getWeekDates(year, week))
  return getMasterGames().filter((g) => {
    const assignment = getAssignment(gameKey(g.sport, g.gameId))
    if (assignment.location !== office) return false
    return days.has(getEtDateKey(g.dateUtc))
  })
}

function isWeekAssigned(office, year, week) {
  const games = weekOfficeGames(office, year, week)
  if (games.length === 0) return false
  return games.every((g) => {
    const assignment = getAssignment(gameKey(g.sport, g.gameId))
    return (assignment.traders || []).some((t) => (t.roleNote || '').trim() !== '')
  })
}

export function getMasterRosterRecord(office, year, week) {
  const all = loadAll()
  return all[key(office, year, week)] || null
}

export function getMasterRosterStatus(office, year, week) {
  const rec = getMasterRosterRecord(office, year, week)
  return rec?.status || ROSTER_STATUS.EMPTY
}

export function listMasterRosterRecords() {
  return Object.values(loadAll())
}

export function saveMasterRosterRecord(record) {
  const all = loadAll()
  all[key(record.office, record.year, record.week)] = record
  saveAll(all)
  return all[key(record.office, record.year, record.week)]
}

export function deleteMasterRosterRecord(office, year, week) {
  const all = loadAll()
  delete all[key(office, year, week)]
  saveAll(all)
}

export function buildMasterRosterFromApproval({
  office,
  year,
  week,
  approvedBy,
  approvedAtIso,
  runPreview,
}) {
  const days = (runPreview?.days || []).map((day) => {
    const workingById = new Map()
    if (Array.isArray(day.sportAllocations)) {
      for (const allocation of day.sportAllocations) {
        const sport = normalizeSportCode(allocation.sport, { allowOther: true })
        for (const trader of allocation.assigned || []) {
          const prev = workingById.get(trader.traderId) || {
            traderId: trader.traderId,
            name: trader.name || trader.traderId,
            sports: new Set(),
          }
          prev.sports.add(sport)
          workingById.set(trader.traderId, prev)
        }
      }
    } else {
      for (const g of day.games || []) {
        const sport = normalizeSportCode(g.sport || g.game?.sport, { allowOther: true })
        for (const t of g.locked || []) {
          const prev = workingById.get(t.traderId) || {
            traderId: t.traderId,
            name: t.name || t.traderId,
            sports: new Set(),
          }
          prev.sports.add(sport)
          workingById.set(t.traderId, prev)
        }
        for (const t of g.suggested || []) {
          const prev = workingById.get(t.traderId) || {
            traderId: t.traderId,
            name: t.name || t.traderId,
            sports: new Set(),
          }
          prev.sports.add(normalizeSportCode(t.sport || sport, { allowOther: true }))
          workingById.set(t.traderId, prev)
        }
      }
    }
    const working = Array.from(workingById.values()).map((row) => ({
      traderId: row.traderId,
      name: row.name,
      sports: Array.from(row.sports.values()).sort(),
    }))

    const availability = getAvailabilityReport(day.dateStr).filter((r) => (r.location || '') === office)
    const notWorking = availability
      .filter((r) => !workingById.has(r.traderId))
      .map((r) => ({ traderId: r.traderId, name: r.name || r.traderId, status: r.status || 'unknown' }))

    return {
      dateStr: day.dateStr,
      games: day.summary?.games || 0,
      demand: day.summary?.demand || 0,
      working,
      notWorking,
    }
  })

  return {
    office,
    year,
    week,
    status: isWeekAssigned(office, year, week) ? ROSTER_STATUS.ASSIGNED : ROSTER_STATUS.ALLOCATED,
    approvedBy: approvedBy || 'Manager',
    approvedAtIso: approvedAtIso || new Date().toISOString(),
    runAtIso: runPreview?.ranAtIso || null,
    totals: runPreview?.totals || null,
    days,
  }
}

export function refreshMasterRosterStatus(office, year, week) {
  const rec = getMasterRosterRecord(office, year, week)
  if (!rec) return null
  const nextStatus = isWeekAssigned(office, year, week) ? ROSTER_STATUS.ASSIGNED : ROSTER_STATUS.ALLOCATED
  if (rec.status === nextStatus) return rec
  const updated = { ...rec, status: nextStatus }
  return saveMasterRosterRecord(updated)
}

export function seedMasterRosterIfMissing() {
  const all = loadAll()
  if (Object.keys(all).length > 0) return
  const now = new Date()
  const office = 'Dublin'
  const year = now.getFullYear()
  const week = getIsoWeek(now)
  const rec = {
    office,
    year,
    week,
    status: ROSTER_STATUS.EMPTY,
    approvedBy: null,
    approvedAtIso: null,
    runAtIso: null,
    totals: null,
    days: [],
  }
  all[key(office, year, week)] = rec
  saveAll(all)
}
