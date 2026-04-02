import {
  AVAILABILITY_STATUS_PRIORITY,
  OFFICE_LOCATIONS,
  SPORT_CODES,
  normalizeSportCode,
} from '../constants/preAllocation'
import { formatFullDateEt } from '../calendar'
import { buildRequirementSnapshot, getRequirementsForWeek } from '../requirements/selectors'
import { findTraderDataIssues, getActiveTraders, buildTraderSkillLookup } from '../traders/selectors'

function buildDailyEligibleCandidates(day, allocation, skillLookup) {
  return (day.availability || [])
    .filter((candidate) => ['preferred_in', 'available', 'no_preference'].includes(candidate.status))
    .filter((candidate) => {
      if (!candidate.sport) return true
      if (candidate.source !== 'PREFERENCE') return true
      if (!['preferred_in', 'available'].includes(candidate.status)) return true
      return normalizeSportCode(candidate.sport, { allowOther: true }) === allocation.sport
    })
    .filter((candidate) => skillLookup.getLevel(candidate.traderId, allocation.sport) >= allocation.requiredCapability)
    .sort((left, right) => (
      (AVAILABILITY_STATUS_PRIORITY[right.status] || 0) - (AVAILABILITY_STATUS_PRIORITY[left.status] || 0) ||
      (left.name || '').localeCompare(right.name || '')
    ))
}

function summarizeSportCounts(traders, skillLookup) {
  return SPORT_CODES.map((sport) => ({
    sport,
    count: traders.filter((trader) => skillLookup.getLevel(trader.traderId, sport) > 0).length,
  }))
}

function buildSuspiciousRequirementRows(requirements) {
  const suspicious = []
  const seen = new Map()

  requirements.forEach((requirement) => {
    seen.set(requirement.id, (seen.get(requirement.id) || 0) + 1)

    if (requirement.gamesCount > 0 && requirement.requiredCount === 0) {
      suspicious.push({
        type: 'zero_demand',
        requirementId: requirement.id,
        date: requirement.date,
        sport: requirement.sport,
        message: 'Games are assigned but required count is zero.',
      })
    }
    if (requirement.requiredCount > 0 && requirement.gamesCount === 0) {
      suspicious.push({
        type: 'no_games',
        requirementId: requirement.id,
        date: requirement.date,
        sport: requirement.sport,
        message: 'Required count is greater than zero but no games are assigned.',
      })
    }
    if (requirement.requestedTraderIds.length > requirement.requiredCount && requirement.requiredCount > 0) {
      suspicious.push({
        type: 'too_many_requests',
        requirementId: requirement.id,
        date: requirement.date,
        sport: requirement.sport,
        message: 'Requested traders exceed required count.',
      })
    }
  })

  const duplicates = Array.from(seen.entries())
    .filter(([, count]) => count > 1)
    .map(([requirementId, count]) => ({
      requirementId,
      count,
    }))

  return { suspicious, duplicates }
}

export function summarizeReadiness({ year, week, office }) {
  if (!office) {
    return {
      selection: { year, week, office },
      traders: null,
      requirements: null,
      warnings: null,
      status: { level: 'not_ready', label: 'Not Ready', blocking: 1, warnings: 0 },
    }
  }

  const traders = getActiveTraders({ location: office })
  const skillLookup = buildTraderSkillLookup(traders)
  const traderIssues = findTraderDataIssues({
    locations: OFFICE_LOCATIONS,
    sports: SPORT_CODES,
  }).filter((issue) => traders.some((trader) => trader.traderId === issue.traderId))
  const traderErrorIds = new Set(traderIssues.filter((issue) => issue.severity === 'error').map((issue) => issue.traderId))
  const traderWarningIds = new Set(traderIssues.filter((issue) => issue.severity === 'warning').map((issue) => issue.traderId))
  const missingSkillData = traders.filter((trader) => trader.skills.length === 0)
  const missingAvailability = traders.filter((trader) => trader.preferences.ranges.length === 0)
  const traderCountsBySport = summarizeSportCounts(traders, skillLookup)

  const requirementsSnapshot = buildRequirementSnapshot(year, week, office, skillLookup)
  const requirements = getRequirementsForWeek(year, week, office)
  const requirementErrors = requirementsSnapshot.issues.filter((issue) => issue.severity === 'error')
  const requirementWarnings = requirementsSnapshot.issues.filter((issue) => issue.severity === 'warning')
  const { suspicious, duplicates } = buildSuspiciousRequirementRows(requirements)

  const noEligible = []
  const thinCoverage = []
  const demandExceedsSupply = []
  const singlePointFailures = []
  const missingSeniorCoverage = []

  requirementsSnapshot.days.forEach((day) => {
    day.sportBreakdown.forEach((allocation) => {
      if (allocation.demand <= 0) return
      const candidates = buildDailyEligibleCandidates(day, allocation, skillLookup)
      const eligibleCount = candidates.length
      const l3Count = candidates.filter((candidate) => skillLookup.getLevel(candidate.traderId, allocation.sport) >= 3).length
      const summary = {
        date: day.dateStr,
        dateLabel: formatFullDateEt(day.dateStr),
        sport: allocation.sport,
        demand: allocation.demand,
        eligible: eligibleCount,
        requiredCapability: allocation.requiredCapability,
      }

      if (eligibleCount === 0) {
        noEligible.push({
          ...summary,
          message: 'No eligible traders are available for this requirement.',
        })
      }
      if (eligibleCount < allocation.demand) {
        demandExceedsSupply.push({
          ...summary,
          message: `Eligible traders ${eligibleCount} is below demand ${allocation.demand}.`,
        })
      }
      if (eligibleCount > 0 && eligibleCount <= allocation.demand + 1) {
        thinCoverage.push({
          ...summary,
          message: `Coverage is thin with only ${eligibleCount} eligible traders.`,
        })
      }
      if (eligibleCount === 1) {
        singlePointFailures.push({
          ...summary,
          message: 'Only one eligible trader can cover this requirement.',
        })
      }
      if (allocation.requiredCapability >= 3 && l3Count === 0) {
        missingSeniorCoverage.push({
          ...summary,
          message: 'No L3-capable trader is available for this requirement.',
        })
      } else if (allocation.requiredCapability >= 3 && l3Count === 1 && eligibleCount !== 1) {
        singlePointFailures.push({
          ...summary,
          message: 'Only one L3-capable trader is available for this requirement.',
        })
      }
    })
  })

  const blockingCount =
    traderErrorIds.size +
    requirementErrors.length +
    requirementsSnapshot.completeness.missing.length +
    noEligible.length +
    demandExceedsSupply.length +
    missingSeniorCoverage.length

  const warningCount =
    traderWarningIds.size +
    requirementWarnings.length +
    missingSkillData.length +
    missingAvailability.length +
    duplicates.length +
    suspicious.length +
    thinCoverage.length +
    singlePointFailures.length

  const status = blockingCount > 0
    ? { level: 'not_ready', label: 'Not Ready', blocking: blockingCount, warnings: warningCount }
    : warningCount > 0
      ? { level: 'ready_with_warnings', label: 'Ready With Warnings', blocking: 0, warnings: warningCount }
      : { level: 'ready', label: 'Ready', blocking: 0, warnings: 0 }

  return {
    selection: { year, week, office },
    traders: {
      activeCount: traders.length,
      missingSkillData,
      missingAvailability,
      invalidCount: traderErrorIds.size,
      warningCount: traderWarningIds.size,
      issues: traderIssues,
      countsBySport: traderCountsBySport,
    },
    requirements: {
      totalCount: requirements.length,
      totals: requirementsSnapshot.totals,
      completeness: requirementsSnapshot.completeness,
      invalidRows: requirementErrors,
      warningRows: requirementWarnings,
      suspiciousRows: suspicious,
      duplicateRows: duplicates,
      days: requirementsSnapshot.days,
    },
    warnings: {
      noEligible,
      thinCoverage,
      demandExceedsSupply,
      singlePointFailures,
      missingSeniorCoverage,
    },
    status,
  }
}
