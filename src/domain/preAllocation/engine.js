import { getAllocationEngineSettings } from '../../data/allocationEngineSettings'
import {
  AVAILABILITY_STATUS_PRIORITY,
  DEMAND_LEVEL_ORDER,
  OFFICE_LOCATIONS,
  normalizeSportCode,
} from '../constants/preAllocation'
import { formatDateTime, getIsoWeek } from '../calendar'
import { buildRequirementSnapshot } from '../requirements/selectors'
import {
  buildTraderSkillLookup,
  getActiveTraders,
  getTraderRecords,
} from '../traders/selectors'

const EMPTY_REQUIREMENTS = {
  days: [],
  totals: { games: 0, demand: 0, requested: 0, locked: 0 },
  completeness: { days: [], missing: [], allSubmitted: false },
  issues: [],
}

function yieldToUi() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function getTraderMetaLookup(office) {
  return getActiveTraders({ location: office }).reduce((map, trader) => {
    const contractDays = Number(trader.contractDays)
    map.set(trader.traderId, {
      traderId: trader.traderId,
      name: trader.name,
      location: trader.homeLocation,
      contractDays: Number.isFinite(contractDays) && contractDays > 0 ? contractDays : 5,
    })
    return map
  }, new Map())
}

export function getDefaultAllocationSelection() {
  const now = new Date()
  return {
    year: now.getFullYear(),
    week: getIsoWeek(now),
    office: '',
  }
}

export function getAllocationOffices() {
  return OFFICE_LOCATIONS
}

export function getEmptyRequirementsSnapshot() {
  return EMPTY_REQUIREMENTS
}

export function loadRequirementSnapshot(year, week, office) {
  if (!office) return EMPTY_REQUIREMENTS
  const skillLookup = buildTraderSkillLookup()
  return buildRequirementSnapshot(year, week, office, skillLookup)
}

export function getAllocationEngineOptions() {
  return getAllocationEngineSettings()
}

export function formatApprovalDateTime(value) {
  return formatDateTime(value)
}

/**
 * Candidate input contract for allocation-ready trader data.
 * Each row is normalized and stable before allocation logic consumes it.
 */
export function buildAllocationCandidateInputs(office) {
  const skillLookup = buildTraderSkillLookup()
  return getTraderRecords()
    .filter((trader) => trader.active !== false && (!office || trader.homeLocation === office))
    .map((trader) => {
      const contractDays = Number(trader.contractDays)
      return {
        traderId: trader.traderId,
        name: trader.name,
        location: trader.homeLocation,
        contractDays: Number.isFinite(contractDays) && contractDays > 0 ? contractDays : 5,
        skills: trader.skills.map((skill) => ({
          sport: skill.sport,
          level: skillLookup.getLevel(trader.traderId, skill.sport),
          primary: skillLookup.isPrimary(trader.traderId, skill.sport),
        })),
        preferences: trader.preferences,
        availability: trader.availability,
      }
    })
}

export async function runAllocationPreview(requirements, office, options, onProgress) {
  const traderMeta = getTraderMetaLookup(office)
  const skillLookup = buildTraderSkillLookup()
  const weeklyUsage = new Map()
  const duplicateLocked = []

  const updateProgress = async (label, percent) => {
    if (onProgress) onProgress({ label, percent })
    await yieldToUi()
  }

  await updateProgress('Preparing weekly requirement state', 10)

  const dayStates = requirements.days.map((day) => {
    const takenForDay = new Set()
    const sportAllocations = day.sportBreakdown.map((row) => {
      const assigned = []
      row.lockedWorkers.forEach((worker) => {
        if (takenForDay.has(worker.traderId)) {
          duplicateLocked.push({
            dateStr: day.dateStr,
            traderId: worker.traderId,
            traderName: worker.name,
            sport: row.sport,
          })
          return
        }
        takenForDay.add(worker.traderId)
        assigned.push({
          traderId: worker.traderId,
          name: worker.name,
          level: worker.level,
          primary: skillLookup.isPrimary(worker.traderId, row.sport),
          source: 'LOCKED',
        })
      })
      return {
        sport: row.sport,
        officeGames: row.officeGames,
        fullSlateGames: row.fullSlateGames,
        requiredCapability: row.requiredCapability,
        demand: row.demand,
        demandLevel: row.demandLevel,
        requestedTraderIds: row.requestedTraderIds,
        assigned,
        gap: Math.max(0, row.demand - assigned.length),
      }
    })

    takenForDay.forEach((traderId) => {
      weeklyUsage.set(traderId, (weeklyUsage.get(traderId) || 0) + 1)
    })

    return {
      ...day,
      takenForDay,
      officeAvailability: day.availability.filter((row) => row.location === office),
      sportAllocations,
    }
  })

  function getContractTarget(traderId) {
    return traderMeta.get(traderId)?.contractDays || 5
  }

  function getOverflowCap(traderId) {
    return Math.max(getContractTarget(traderId), options.maxGamesPerTrader || 5)
  }

  function canUseCandidate(dayState, traderId, allowOverflow) {
    if (dayState.takenForDay.has(traderId)) return false
    const usage = weeklyUsage.get(traderId) || 0
    return usage < (allowOverflow ? getOverflowCap(traderId) : getContractTarget(traderId))
  }

  function assignCandidate(dayState, allocation, candidate, source) {
    allocation.assigned.push({
      traderId: candidate.traderId,
      name: candidate.name,
      level: skillLookup.getLevel(candidate.traderId, allocation.sport),
      primary: skillLookup.isPrimary(candidate.traderId, allocation.sport),
      source,
    })
    allocation.gap = Math.max(0, allocation.demand - allocation.assigned.length)
    dayState.takenForDay.add(candidate.traderId)
    weeklyUsage.set(candidate.traderId, (weeklyUsage.get(candidate.traderId) || 0) + 1)
  }

  function candidateScore(candidate, allocation) {
    const usage = weeklyUsage.get(candidate.traderId) || 0
    const target = getContractTarget(candidate.traderId)
    const sportLevel = skillLookup.getLevel(candidate.traderId, allocation.sport)
    const primaryBonus = skillLookup.isPrimary(candidate.traderId, allocation.sport) ? 6 : 0
    const requestToWorkBonus = candidate.source === 'REQUEST' && candidate.status === 'available' ? 10 : 0
    const ownerRequestBonus = allocation.requestedTraderIds.includes(candidate.traderId) ? 12 : 0
    const contractNeed = Math.max(0, target - usage)
    return (
      ownerRequestBonus * 100 +
      requestToWorkBonus * 100 +
      (AVAILABILITY_STATUS_PRIORITY[candidate.status] || 0) * 25 +
      sportLevel * 12 +
      primaryBonus * 4 +
      contractNeed * 3 -
      Math.max(0, usage - target) * 20
    )
  }

  function getEligibleCandidates(dayState, allocation, statuses, allowOverflow = false, levelFloor = allocation.requiredCapability) {
    return dayState.officeAvailability
      .filter((candidate) => statuses.includes(candidate.status))
      .filter((candidate) => {
        if (!candidate.sport) return true
        if (candidate.source !== 'PREFERENCE') return true
        if (!['preferred_in', 'available'].includes(candidate.status)) return true
        return normalizeSportCode(candidate.sport, { allowOther: true }) === allocation.sport
      })
      .filter((candidate) => canUseCandidate(dayState, candidate.traderId, allowOverflow))
      .filter((candidate) => skillLookup.getLevel(candidate.traderId, allocation.sport) >= levelFloor)
      .sort((left, right) => {
        const scoreDiff = candidateScore(right, allocation) - candidateScore(left, allocation)
        if (scoreDiff !== 0) return scoreDiff
        return (left.name || '').localeCompare(right.name || '')
      })
  }

  const demandQueue = dayStates
    .flatMap((dayState) => dayState.sportAllocations.map((allocation) => ({ dayState, allocation })))
    .filter(({ allocation }) => allocation.demand > 0)
    .sort((left, right) => {
      const ratingDiff = DEMAND_LEVEL_ORDER[right.allocation.demandLevel] - DEMAND_LEVEL_ORDER[left.allocation.demandLevel]
      if (ratingDiff !== 0) return ratingDiff
      if (right.allocation.demand !== left.allocation.demand) return right.allocation.demand - left.allocation.demand
      return left.dayState.dateStr.localeCompare(right.dayState.dateStr)
    })

  await updateProgress('Pass 1: requested traders and mandatory INs', 25)
  for (const { dayState, allocation } of demandQueue) {
    for (const traderId of allocation.requestedTraderIds) {
      if (allocation.gap <= 0) break
      const candidate = dayState.officeAvailability.find((row) => row.traderId === traderId)
      if (!candidate) continue
      if (!['preferred_in', 'available', 'no_preference'].includes(candidate.status)) continue
      if (!canUseCandidate(dayState, traderId, false)) continue
      if (skillLookup.getLevel(traderId, allocation.sport) < allocation.requiredCapability) continue
      assignCandidate(dayState, allocation, candidate, 'REQUESTED')
    }

    const requestToWorkCandidates = getEligibleCandidates(dayState, allocation, ['available'], false)
      .filter((candidate) => candidate.source === 'REQUEST')
    for (const candidate of requestToWorkCandidates) {
      if (allocation.gap <= 0) break
      assignCandidate(dayState, allocation, candidate, 'REQUEST_TO_WORK')
    }
  }

  await updateProgress('Pass 2: seniority coverage by sport', 40)
  for (const { dayState, allocation } of demandQueue) {
    if (allocation.demand <= 0 || allocation.gap <= 0) continue
    const hasL3 = allocation.assigned.some((candidate) => candidate.level >= 3)
    if (hasL3) continue
    const l3Candidate = getEligibleCandidates(dayState, allocation, ['preferred_in', 'available', 'no_preference'], false, 3)[0]
    if (l3Candidate) assignCandidate(dayState, allocation, l3Candidate, 'L3_COVERAGE')
  }

  await updateProgress('Pass 3: preferred IN matching', 55)
  for (const { dayState, allocation } of demandQueue) {
    let candidates = getEligibleCandidates(dayState, allocation, ['preferred_in', 'available'], false)
    for (const candidate of candidates) {
      if (allocation.gap <= 0) break
      assignCandidate(dayState, allocation, candidate, 'PREFERENCE')
    }

    candidates = getEligibleCandidates(dayState, allocation, ['no_preference'], false)
    for (const candidate of candidates) {
      if (allocation.gap <= 0) break
      assignCandidate(dayState, allocation, candidate, 'DEMAND_FILL')
    }
  }

  await updateProgress('Pass 4: demand balancing and secondary fills', 72)
  for (const { dayState, allocation } of demandQueue) {
    const overflowCandidates = getEligibleCandidates(dayState, allocation, ['preferred_in', 'available', 'no_preference'], true)
    for (const candidate of overflowCandidates) {
      if (allocation.gap <= 0) break
      assignCandidate(dayState, allocation, candidate, 'OVERFLOW')
    }
  }

  await updateProgress('Pass 5: contract and anomaly checks', 88)

  const days = dayStates.map((dayState) => {
    const assignedNames = Array.from(new Set(
      dayState.sportAllocations.flatMap((allocation) => allocation.assigned.map((candidate) => candidate.name))
    ))
    const assignedCount = dayState.sportAllocations.reduce((sum, allocation) => sum + allocation.assigned.length, 0)
    const gap = dayState.sportAllocations.reduce((sum, allocation) => sum + allocation.gap, 0)
    return {
      dateStr: dayState.dateStr,
      label: dayState.label,
      sportAllocations: dayState.sportAllocations,
      summary: {
        games: dayState.summary.games,
        demand: dayState.summary.demand,
        assigned: assignedCount,
        gap,
        demandLevel: dayState.summary.dayRating,
      },
      assignedNames,
      availability: dayState.officeAvailability,
    }
  })

  const totals = days.reduce((sum, day) => ({
    games: sum.games + day.summary.games,
    demand: sum.demand + day.summary.demand,
    assigned: sum.assigned + day.summary.assigned,
    gap: sum.gap + day.summary.gap,
  }), { games: 0, demand: 0, assigned: 0, gap: 0 })

  const shortages = []
  const missingL3 = []
  days.forEach((day) => {
    day.sportAllocations.forEach((allocation) => {
      if (allocation.gap > 0) {
        shortages.push({
          dateStr: day.dateStr,
          sport: allocation.sport,
          gap: allocation.gap,
          demand: allocation.demand,
          assigned: allocation.assigned.length,
        })
      }
      if (allocation.demand > 0 && !allocation.assigned.some((candidate) => candidate.level >= 3)) {
        missingL3.push({
          dateStr: day.dateStr,
          sport: allocation.sport,
          assigned: allocation.assigned.length,
          demand: allocation.demand,
        })
      }
    })
  })

  const contractMismatches = Array.from(traderMeta.values())
    .map((trader) => {
      let assignedDays = 0
      days.forEach((day) => {
        if (day.sportAllocations.some((allocation) => allocation.assigned.some((candidate) => candidate.traderId === trader.traderId))) {
          assignedDays += 1
        }
      })
      return {
        traderId: trader.traderId,
        name: trader.name,
        targetDays: trader.contractDays,
        assignedDays,
        delta: assignedDays - trader.contractDays,
      }
    })
    .filter((row) => row.delta !== 0)
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta) || left.name.localeCompare(right.name))

  const overscheduled = contractMismatches.filter((row) => row.delta > 0)
  const underscheduled = contractMismatches.filter((row) => row.delta < 0)

  await updateProgress('Finalizing weekly roster report', 100)

  return {
    ranAtIso: new Date().toISOString(),
    settings: { ...options },
    days,
    totals,
    audit: {
      shortages,
      missingL3,
      duplicateLocked,
      overscheduled,
      underscheduled,
      summary: {
        shortages: shortages.length,
        missingL3: missingL3.length,
        duplicateLocked: duplicateLocked.length,
        overscheduled: overscheduled.length,
        underscheduled: underscheduled.length,
        blocking: shortages.length + missingL3.length + duplicateLocked.length,
      },
    },
  }
}
