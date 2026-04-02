import { getAvailabilityReport } from '../../data/availabilityReport'
import { getAllAssignments, gameKey } from '../../data/birAssignments'
import { getMasterGames } from '../../data/birScheduleMaster'
import {
  getOwnerDailyRequirement,
  getRequirementWeekStatus,
} from '../../data/ownerDailyRequirements'
import {
  AVAILABILITY_STATUS_LABELS,
  AVAILABILITY_STATUS_ORDER,
  DEMAND_LEVEL_ORDER,
  OFFICE_LOCATIONS,
  normalizeSportCode,
  SPORT_CODES,
} from '../constants/preAllocation'
import {
  formatFullDateEt,
  formatShortDayLabel,
  getEtDateKey,
  getWeekDates,
} from '../calendar'
import { normalizeRequirement, validateRequirement } from './model'
import { getActiveTraders } from '../traders/selectors'

function emptyWeekStatus() {
  return {
    days: [],
    missing: [],
    allSubmitted: false,
  }
}

function groupGamesByDate(games = []) {
  const grouped = new Map()
  games.forEach((game) => {
    const dateStr = getEtDateKey(game?.dateUtc)
    if (!dateStr) return
    if (!grouped.has(dateStr)) grouped.set(dateStr, [])
    grouped.get(dateStr).push(game)
  })
  return grouped
}

export function getRequirementsForWeek(year, week, location) {
  if (!location) return []
  const weekStatus = getRequirementWeekStatus(year, week, location)
  return weekStatus.days.flatMap((day) => day.sports.map((sportRow) => normalizeRequirement({
    date: day.dateStr,
    location,
    sport: sportRow.sport,
    source: 'OWNER_REQUIREMENT',
    gamesCount: sportRow.gamesCount,
    requirement: sportRow.requirement,
  })))
}

export function groupRequirementsByDay(requirements = []) {
  return requirements.reduce((grouped, requirement) => {
    const key = requirement.date
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key).push(requirement)
    return grouped
  }, new Map())
}

export function findRequirementDataIssues({ year, week, location, locations = [], sports = [] } = {}) {
  return getRequirementsForWeek(year, week, location).flatMap((requirement) => {
    const result = validateRequirement(requirement, { locations, sports })
    return [...result.errors, ...result.warnings].map((message) => ({
      requirementId: requirement.id,
      date: requirement.date,
      sport: requirement.sport,
      severity: result.errors.includes(message) ? 'error' : 'warning',
      message,
    }))
  })
}

export function buildRequirementSnapshot(year, week, office, skillLookup) {
  if (!office) {
    return {
      days: [],
      totals: { games: 0, demand: 0, requested: 0, locked: 0 },
      completeness: emptyWeekStatus(),
      issues: [],
    }
  }

  const dates = getWeekDates(year, week)
  const games = getMasterGames()
  const assignments = getAllAssignments()
  const weekStatus = getRequirementWeekStatus(year, week, office)
  const gamesByDate = groupGamesByDate(games)
  const availabilityNameLookup = new Map()
  const fullSlateByDaySport = new Map()
  const officeGamesByDaySport = new Map()
  const lockedByDaySport = new Map()

  dates.forEach((dateStr) => {
    getAvailabilityReport(dateStr)
      .filter((row) => row.location === office)
      .forEach((row) => availabilityNameLookup.set(`${dateStr}|${row.traderId}`, row.name || row.traderId))
  })

  games.forEach((game) => {
    const dateStr = getEtDateKey(game?.dateUtc)
    if (!dates.includes(dateStr)) return
    const sport = normalizeSportCode(game?.sport, { allowOther: true })
    const key = `${dateStr}|${sport}`
    fullSlateByDaySport.set(key, (fullSlateByDaySport.get(key) || 0) + 1)

    const assignment = assignments[gameKey(game?.sport, game?.gameId)]
    if (assignment?.location !== office) return

    officeGamesByDaySport.set(key, (officeGamesByDaySport.get(key) || 0) + 1)
    const locked = lockedByDaySport.get(key) || new Map()
    ;(assignment?.traders || []).forEach((trader) => {
      if (!trader?.traderId) return
      locked.set(trader.traderId, {
        traderId: trader.traderId,
        name: availabilityNameLookup.get(`${dateStr}|${trader.traderId}`) || trader.traderId,
        level: skillLookup.getLevel(trader.traderId, sport),
        source: 'LOCKED',
      })
    })
    lockedByDaySport.set(key, locked)
  })

  const issues = findRequirementDataIssues({
    year,
    week,
    location: office,
    locations: OFFICE_LOCATIONS,
    sports: SPORT_CODES,
  })
  const days = weekStatus.days.map(({ dateStr, sports }) => {
    const availability = getAvailabilityReport(dateStr).filter((row) => row.location === office)
    const sportBreakdown = sports.map((sportRow) => {
      const normalizedRequirement = normalizeRequirement({
        date: dateStr,
        location: office,
        sport: sportRow.sport,
        source: 'OWNER_REQUIREMENT',
        gamesCount: sportRow.gamesCount,
        requirement: sportRow.requirement,
      })
      const key = `${dateStr}|${normalizedRequirement.sport}`
      const lockedWorkers = Array.from((lockedByDaySport.get(key) || new Map()).values())
      return {
        sport: normalizedRequirement.sport,
        officeGames: officeGamesByDaySport.get(key) || 0,
        fullSlateGames: fullSlateByDaySport.get(key) || 0,
        requiredCapability: normalizedRequirement.capabilityLevel,
        requestedCount: normalizedRequirement.requestedTraderIds.length,
        requestedTraderIds: normalizedRequirement.requestedTraderIds,
        requestedNames: normalizedRequirement.requestedTraderIds.map(
          (traderId) => availabilityNameLookup.get(`${dateStr}|${traderId}`) || traderId
        ),
        demand: normalizedRequirement.requiredCount,
        demandLevel: normalizedRequirement.priority,
        submitted: !!normalizedRequirement.confirmedAt,
        lockedWorkers,
      }
    }).sort((left, right) => left.sport.localeCompare(right.sport))

    const requestedNames = Array.from(new Set(sportBreakdown.flatMap((row) => row.requestedNames)))
    const dayRating = sportBreakdown.reduce((best, row) => (
      DEMAND_LEVEL_ORDER[row.demandLevel] > DEMAND_LEVEL_ORDER[best] ? row.demandLevel : best
    ), 'Quiet')

    return {
      dateStr,
      label: formatShortDayLabel(dateStr),
      fullDateLabel: formatFullDateEt(dateStr),
      availability,
      sportBreakdown,
      requestedNames,
      summary: {
        games: sportBreakdown.reduce((sum, row) => sum + row.officeGames, 0),
        demand: sportBreakdown.reduce((sum, row) => sum + row.demand, 0),
        requested: sportBreakdown.reduce((sum, row) => sum + row.requestedCount, 0),
        locked: sportBreakdown.reduce((sum, row) => sum + row.lockedWorkers.length, 0),
        dayRating,
      },
      totalSlateGames: (gamesByDate.get(dateStr) || []).length,
    }
  })

  const totals = days.reduce((sum, day) => ({
    games: sum.games + day.summary.games,
    demand: sum.demand + day.summary.demand,
    requested: sum.requested + day.summary.requested,
    locked: sum.locked + day.summary.locked,
  }), { games: 0, demand: 0, requested: 0, locked: 0 })

  return {
    days,
    totals,
    completeness: weekStatus,
    issues,
  }
}

export function buildOwnersRequirementsState({ year, week, location, selectedDay, sportFilter }) {
  const weekDays = week ? getWeekDates(year, Number(week)) : []
  const requirementDays = week && location
    ? buildRequirementSnapshot(year, Number(week), location, {
      getLevel() {
        return 0
      },
    }).days
    : []
  const traders = getActiveTraders({ location })

  const daySummaries = weekDays.map((dateStr) => {
    const day = requirementDays.find((entry) => entry.dateStr === dateStr)
    return {
      dateStr,
      label: day?.label || formatShortDayLabel(dateStr),
      totalGames: day?.totalSlateGames || 0,
      assignedGames: day?.summary.games || 0,
      sports: day?.sportBreakdown.map((row) => ({
        sport: row.sport,
        gamesCount: row.officeGames,
        requirement: getOwnerDailyRequirement(dateStr, location, row.sport),
        submitted: row.submitted,
      })) || [],
      submittedSports: day?.sportBreakdown.filter((row) => row.submitted).length || 0,
    }
  })

  const baseSelectedDay = daySummaries.find((day) => day.dateStr === selectedDay) || {
    dateStr: selectedDay,
    label: formatShortDayLabel(selectedDay),
    totalGames: 0,
    assignedGames: 0,
    sports: [],
    submittedSports: 0,
  }

  const activeSport = sportFilter || baseSelectedDay.sports[0]?.sport || ''
  const selectedSportSummary = baseSelectedDay.sports.find((row) => row.sport === activeSport)
  const selectedDaySummary = activeSport && selectedSportSummary
    ? {
      ...baseSelectedDay,
      totalGames: selectedSportSummary.gamesCount || 0,
      assignedGames: selectedSportSummary.gamesCount || 0,
    }
    : baseSelectedDay
  const dailyRequirement = selectedDay && location && activeSport
    ? getOwnerDailyRequirement(selectedDay, location, activeSport)
    : getOwnerDailyRequirement('', '', '')
  const availabilityRows = selectedDay
    ? getAvailabilityReport(selectedDay).filter((row) => {
      if (row.location !== location) return false
      if (!activeSport) return true
      return !row.sport || normalizeSportCode(row.sport, { allowOther: true }) === activeSport
    })
    : []
  const availabilityCounts = AVAILABILITY_STATUS_ORDER.reduce((counts, status) => {
    counts[status] = availabilityRows.filter((row) => row.status === status).length
    return counts
  }, {})
  const requestedTraders = traders.filter((trader) => dailyRequirement.requestedTraderIds.includes(trader.traderId))

  return {
    weekDays,
    weekStatus: week && location ? getRequirementWeekStatus(year, Number(week), location) : emptyWeekStatus(),
    daySummaries,
    selectedDaySummary,
    activeSport,
    dailyRequirement,
    availabilityRows,
    availabilityCounts,
    availabilityStatusLabels: AVAILABILITY_STATUS_LABELS,
    requestableTraders: traders,
    requestedTraders,
  }
}
