import { addGameToMaster, getMasterGames } from './birScheduleMaster'
import { gameKey, setAssignment } from './birAssignments'
import { setOwnerDailyRequirement } from './ownerDailyRequirements'
import { getAllSkills } from './traderSkills'
import { getTraders } from './traders'
import { updateTraderDb } from './traderDb'

const SEED_VERSION = 'v4'
const SEED_MARKER_KEY = `ez-roster-seed-week2-2026-${SEED_VERSION}`
const OWNER_REQUIREMENTS_KEY = 'ez-roster-owner-daily-requirements'
const RANGE_ID = 'wk2-2026'
const REQUEST_PREFIX = 'WK2-2026'
const WEEK_START = '2026-01-05'
const WEEK_END = '2026-01-11'
const WEEK_DATES = [
  '2026-01-05',
  '2026-01-06',
  '2026-01-07',
  '2026-01-08',
  '2026-01-09',
  '2026-01-10',
  '2026-01-11',
]
const KNOWN_SPORTS = new Set(['NBA', 'NFL', 'NHL', 'WNBA', 'MLB', 'NCAAM', 'CFB'])
const SPORT_LOCATIONS = {
  NBA: ['Dublin', 'Melbourne', 'New Jersey'],
  NFL: ['New Jersey', 'Dublin'],
  NHL: ['Dublin', 'Melbourne'],
  WNBA: ['New Jersey', 'Melbourne'],
  MLB: ['New Jersey', 'Dublin'],
  NCAAM: ['Melbourne', 'Dublin'],
  CFB: ['Melbourne', 'Dublin', 'New Jersey'],
}
const FALLBACK_WEEK2_GAMES_2026 = [
  { gameId: 'wk2-2026-001', sport: 'NBA', dateUtc: '2026-01-05T18:00:00.000Z', away: 'Lakers', home: 'Celtics', venue: 'TD Garden' },
  { gameId: 'wk2-2026-002', sport: 'NHL', dateUtc: '2026-01-05T20:00:00.000Z', away: 'Rangers', home: 'Bruins', venue: 'Garden' },
  { gameId: 'wk2-2026-003', sport: 'NBA', dateUtc: '2026-01-05T22:30:00.000Z', away: 'Bucks', home: 'Heat', venue: 'Kaseya Center' },
  { gameId: 'wk2-2026-004', sport: 'MLB', dateUtc: '2026-01-06T17:00:00.000Z', away: 'Yankees', home: 'Red Sox', venue: 'Fenway Park' },
  { gameId: 'wk2-2026-005', sport: 'NFL', dateUtc: '2026-01-06T20:00:00.000Z', away: 'Bills', home: 'Chiefs', venue: 'Arrowhead' },
  { gameId: 'wk2-2026-006', sport: 'NHL', dateUtc: '2026-01-06T23:00:00.000Z', away: 'Canucks', home: 'Oilers', venue: 'Rogers Place' },
  { gameId: 'wk2-2026-007', sport: 'NCAAM', dateUtc: '2026-01-07T18:30:00.000Z', away: 'Duke', home: 'UNC', venue: 'Dean Dome' },
  { gameId: 'wk2-2026-008', sport: 'WNBA', dateUtc: '2026-01-07T21:00:00.000Z', away: 'Liberty', home: 'Aces', venue: 'Michelob ULTRA Arena' },
  { gameId: 'wk2-2026-009', sport: 'NBA', dateUtc: '2026-01-07T23:30:00.000Z', away: 'Knicks', home: 'Bulls', venue: 'United Center' },
  { gameId: 'wk2-2026-010', sport: 'NBA', dateUtc: '2026-01-08T18:00:00.000Z', away: 'Suns', home: 'Nuggets', venue: 'Ball Arena' },
  { gameId: 'wk2-2026-011', sport: 'CFB', dateUtc: '2026-01-08T20:00:00.000Z', away: 'Michigan', home: 'Ohio State', venue: 'Ohio Stadium' },
  { gameId: 'wk2-2026-012', sport: 'MLB', dateUtc: '2026-01-08T23:00:00.000Z', away: 'Dodgers', home: 'Padres', venue: 'Petco Park' },
  { gameId: 'wk2-2026-013', sport: 'NBA', dateUtc: '2026-01-09T18:30:00.000Z', away: 'Warriors', home: 'Kings', venue: 'Golden 1 Center' },
  { gameId: 'wk2-2026-014', sport: 'NHL', dateUtc: '2026-01-09T20:00:00.000Z', away: 'Flyers', home: 'Devils', venue: 'Prudential Center' },
  { gameId: 'wk2-2026-015', sport: 'MLB', dateUtc: '2026-01-09T23:00:00.000Z', away: 'Mets', home: 'Phillies', venue: 'Citizens Bank Park' },
  { gameId: 'wk2-2026-016', sport: 'NCAAM', dateUtc: '2026-01-10T17:00:00.000Z', away: 'UCLA', home: 'Arizona', venue: 'McKale Center' },
  { gameId: 'wk2-2026-017', sport: 'NFL', dateUtc: '2026-01-10T19:30:00.000Z', away: '49ers', home: 'Seahawks', venue: 'Lumen Field' },
  { gameId: 'wk2-2026-018', sport: 'NBA', dateUtc: '2026-01-10T22:00:00.000Z', away: 'Heat', home: 'Knicks', venue: 'MSG' },
  { gameId: 'wk2-2026-019', sport: 'CFB', dateUtc: '2026-01-11T18:00:00.000Z', away: 'Alabama', home: 'Georgia', venue: 'Mercedes-Benz Stadium' },
  { gameId: 'wk2-2026-020', sport: 'NBA', dateUtc: '2026-01-11T20:30:00.000Z', away: 'Celtics', home: '76ers', venue: 'Wells Fargo Center' },
  { gameId: 'wk2-2026-021', sport: 'NHL', dateUtc: '2026-01-11T23:00:00.000Z', away: 'Avalanche', home: 'Stars', venue: 'American Airlines Center' },
]

function createEmptyDay(dayIndex) {
  return {
    dayIndex,
    preference: 'NO_PREFERENCE',
    sport: '',
    shiftTiming: 'FULL',
  }
}

function gameDateEt(dateUtc) {
  if (!dateUtc) return ''
  try {
    return new Date(dateUtc).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  } catch {
    return ''
  }
}

function normalizeSport(sport) {
  const upper = (sport || '').trim().toUpperCase()
  if (upper === 'CBB') return 'NCAAM'
  return KNOWN_SPORTS.has(upper) ? upper : 'OTHER'
}

function sortGames(games) {
  return [...games].sort((a, b) => {
    const dateCompare = String(a.dateUtc || '').localeCompare(String(b.dateUtc || ''))
    if (dateCompare !== 0) return dateCompare
    const sportCompare = normalizeSport(a.sport).localeCompare(normalizeSport(b.sport))
    if (sportCompare !== 0) return sportCompare
    return String(a.gameId || '').localeCompare(String(b.gameId || ''))
  })
}

function getWeek2Games() {
  FALLBACK_WEEK2_GAMES_2026.forEach((game) => {
    addGameToMaster({
      sport: game.sport,
      gameId: game.gameId,
      dateUtc: game.dateUtc,
      status: 'Scheduled',
      statusDetail: 'Scheduled',
      homeTeam: { name: game.home, score: null },
      awayTeam: { name: game.away, score: null },
      venue: { name: game.venue },
    })
  })

  return sortGames(
    getMasterGames().filter((game) =>
      FALLBACK_WEEK2_GAMES_2026.some((fallback) => fallback.gameId === game.gameId)
    )
  )
}

function clearWeek2Assignments() {
  const controlledIds = new Set(FALLBACK_WEEK2_GAMES_2026.map((game) => game.gameId))
  getMasterGames()
    .filter((game) => WEEK_DATES.includes(gameDateEt(game.dateUtc).slice(0, 10)))
    .forEach((game) => {
      const key = gameKey(game.sport, game.gameId)
      if (!controlledIds.has(game.gameId)) {
        setAssignment(key, { location: null, traders: [] })
        return
      }
      setAssignment(key, { location: null, traders: [] })
    })
}

function clearWeek2OwnerRequirements() {
  try {
    const raw = localStorage.getItem(OWNER_REQUIREMENTS_KEY)
    if (!raw) return
    const data = JSON.parse(raw)
    if (!data || typeof data !== 'object') return
    Object.keys(data).forEach((key) => {
      if (WEEK_DATES.some((dateStr) => key.startsWith(`${dateStr}|`))) delete data[key]
    })
    localStorage.setItem(OWNER_REQUIREMENTS_KEY, JSON.stringify(data))
  } catch (error) {
    console.warn('Failed to clear Week 2 owner requirements:', error)
  }
}

function buildSkillLookup(traders) {
  const traderById = new Map(traders.map((trader) => [trader.traderId, trader]))
  const lookup = new Map()

  getAllSkills().forEach((skill) => {
    const trader = traderById.get(skill?.traderId)
    if (!trader || trader.active === false) return
    const office = trader.location || ''
    const sport = normalizeSport(skill?.sport)
    if (!office || sport === 'OTHER') return
    const level = skill?.level === 3 ? 3 : skill?.level === 2 ? 2 : 1
    const key = `${office}|${sport}`
    const current = lookup.get(key) || []
    current.push({
      traderId: trader.traderId,
      name: `${trader.firstName || ''} ${trader.lastName || ''}`.trim() || trader.alias || trader.traderId,
      office,
      sport,
      level,
      primary: skill?.type === 'primary',
      appUserLevel: trader.appUserLevel || 'User',
    })
    lookup.set(key, current)
  })

  lookup.forEach((rows, key) => {
    lookup.set(
      key,
      [...rows].sort((a, b) => {
        if (b.level !== a.level) return b.level - a.level
        if (a.primary !== b.primary) return a.primary ? -1 : 1
        if (a.appUserLevel !== b.appUserLevel) {
          const rank = { User: 0, Owner: 1, Manager: 2, Admin: 3 }
          return (rank[a.appUserLevel] ?? 9) - (rank[b.appUserLevel] ?? 9)
        }
        return a.name.localeCompare(b.name)
      })
    )
  })

  return lookup
}

function pickLocationForGame(game, indexBySport) {
  const sport = normalizeSport(game.sport)
  const options = SPORT_LOCATIONS[sport] || ['Dublin', 'Melbourne', 'New Jersey']
  const count = indexBySport.get(sport) || 0
  const dateStr = gameDateEt(game.dateUtc).slice(0, 10)
  const dayOffset = Math.max(0, WEEK_DATES.indexOf(dateStr))
  const location = options[(count + dayOffset) % options.length]
  indexBySport.set(sport, count + 1)
  return location
}

function getDemandLevel(totalGames) {
  if (totalGames <= 1) return 'Skeleton'
  if (totalGames <= 3) return 'Quiet'
  if (totalGames <= 5) return 'Medium'
  return 'Busy'
}

function getCapabilityLevel(sport, gamesCount, demandLevel) {
  if (sport === 'NFL' || sport === 'CFB') return 3
  if (gamesCount >= 3 || demandLevel === 'Busy') return 3
  if (sport === 'WNBA') return 1
  return 2
}

function getTradersNeeded(sport, gamesCount, demandLevel) {
  const demandBonus = demandLevel === 'Busy' ? 2 : demandLevel === 'Medium' ? 1 : 0
  const sportBonus = sport === 'NBA' || sport === 'NFL' || sport === 'CFB' ? 1 : 0
  return Math.max(1, gamesCount + demandBonus + sportBonus)
}

function setDayPreference(day, preference, sport = '', shiftTiming = 'FULL') {
  if (!day) return
  day.preference = preference
  day.sport = preference === 'ON' || preference === 'PREFERRED_ON' ? sport : ''
  day.shiftTiming = shiftTiming
}

function buildWeek2Plans(traders, requirementRows, skillLookup) {
  const plans = new Map(
    traders.map((trader) => [
      trader.traderId,
      {
        traderId: trader.traderId,
        days: Array.from({ length: 7 }, (_, index) => createEmptyDay(index)),
        requests: [],
      },
    ])
  )
  const usedByOfficeDate = new Map()
  const ownerRequestsByRow = new Map()

  const rows = [...requirementRows].sort((a, b) => {
    const dateCompare = a.dateStr.localeCompare(b.dateStr)
    if (dateCompare !== 0) return dateCompare
    const officeCompare = a.location.localeCompare(b.location)
    if (officeCompare !== 0) return officeCompare
    return a.sport.localeCompare(b.sport)
  })

  rows.forEach((row, rowIndex) => {
    const dayIndex = WEEK_DATES.indexOf(row.dateStr)
    const usedKey = `${row.location}|${row.dateStr}`
    const used = usedByOfficeDate.get(usedKey) || new Set()
    usedByOfficeDate.set(usedKey, used)

    const pool = (skillLookup.get(`${row.location}|${row.sport}`) || []).filter(
      (candidate) => !used.has(candidate.traderId)
    )
    const requestedTraderIds = []

    const dayInCandidate = pool.shift()
    if (dayInCandidate) {
      const plan = plans.get(dayInCandidate.traderId)
      plan.requests.push({
        id: `${REQUEST_PREFIX}-IN-${row.dateStr}-${dayInCandidate.traderId}`,
        traderId: dayInCandidate.traderId,
        type: 'DAY_IN',
        fromDate: row.dateStr,
        toDate: row.dateStr,
        note: `${row.sport} requested to work`,
        status: 'CONFIRMED',
      })
      requestedTraderIds.push(dayInCandidate.traderId)
      used.add(dayInCandidate.traderId)
    }

    const mandatoryCandidate = pool.shift()
    if (mandatoryCandidate) {
      const plan = plans.get(mandatoryCandidate.traderId)
      setDayPreference(plan.days[dayIndex], 'ON', row.sport, row.gamesCount >= 2 ? 'FULL' : 'LATE')
      requestedTraderIds.push(mandatoryCandidate.traderId)
      used.add(mandatoryCandidate.traderId)
    }

    const preferredTarget = Math.max(1, Math.min(row.tradersNeeded - requestedTraderIds.length, row.gamesCount + 1))
    for (let index = 0; index < preferredTarget; index++) {
      const candidate = pool.shift()
      if (!candidate) break
      const plan = plans.get(candidate.traderId)
      setDayPreference(
        plan.days[dayIndex],
        'PREFERRED_ON',
        row.sport,
        index === 0 && row.demandLevel === 'Busy' ? 'FULL' : 'LATE'
      )
      used.add(candidate.traderId)
    }

    ownerRequestsByRow.set(`${row.dateStr}|${row.location}|${row.sport}`, requestedTraderIds.slice(0, 2))

    const quietPool = traders
      .filter((trader) => trader.location === row.location && !used.has(trader.traderId))
      .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))

    if (rowIndex % 2 === 0 && quietPool[0]) {
      const plan = plans.get(quietPool[0].traderId)
      plan.requests.push({
        id: `${REQUEST_PREFIX}-OFF-${row.dateStr}-${quietPool[0].traderId}`,
        traderId: quietPool[0].traderId,
        type: 'DAY_OFF',
        fromDate: row.dateStr,
        toDate: row.dateStr,
        note: 'Seeded time off request',
        status: row.demandLevel === 'Busy' ? 'PENDING' : 'CONFIRMED',
      })
    } else if (quietPool[0]) {
      const plan = plans.get(quietPool[0].traderId)
      setDayPreference(plan.days[dayIndex], 'PREFERRED_OFF')
    }

    if (quietPool[1] && row.demandLevel !== 'Busy') {
      const plan = plans.get(quietPool[1].traderId)
      setDayPreference(plan.days[dayIndex], 'OFF')
    }
  })

  return { plans, ownerRequestsByRow }
}

function applyWeek2PreferenceAndRequestSeed(plans) {
  updateTraderDb((db) => {
    Object.values(db.traders).forEach((profile) => {
      if (!profile?.traderId) return
      const plan = plans.get(profile.traderId)
      if (!profile.preferences) profile.preferences = { ranges: [] }
      if (!Array.isArray(profile.preferences.ranges)) profile.preferences.ranges = []
      profile.preferences.ranges = profile.preferences.ranges.filter((range) => range.rangeId !== RANGE_ID)
      profile.preferences.ranges.push({
        rangeId: RANGE_ID,
        fromDate: WEEK_START,
        toDate: WEEK_END,
        days: plan?.days || Array.from({ length: 7 }, (_, index) => createEmptyDay(index)),
      })

      const existingRequests = Array.isArray(profile.requests) ? profile.requests : []
      profile.requests = existingRequests.filter((request) => !String(request.id || '').startsWith(REQUEST_PREFIX))
      if (plan?.requests?.length) profile.requests.push(...plan.requests)
    })
  })
}

export function seedWeek22026RequirementsIfNeeded() {
  try {
    if (localStorage.getItem(SEED_MARKER_KEY)) return

    const traders = getTraders().filter((trader) => trader.active !== false)
    const weekGames = getWeek2Games().filter((game) => KNOWN_SPORTS.has(normalizeSport(game.sport)))
    clearWeek2Assignments()
    clearWeek2OwnerRequirements()
    const locationIndexes = new Map()
    const groupedRows = new Map()
    const totalGamesByOfficeDay = new Map()

    weekGames.forEach((game) => {
      const sport = normalizeSport(game.sport)
      const dateStr = gameDateEt(game.dateUtc).slice(0, 10)
      if (!WEEK_DATES.includes(dateStr)) return

      const key = gameKey(game.sport, game.gameId)
      const location = pickLocationForGame(game, locationIndexes)
      setAssignment(key, { location, traders: [] })

      const rowKey = `${dateStr}|${location}|${sport}`
      const current = groupedRows.get(rowKey) || {
        dateStr,
        location,
        sport,
        gamesCount: 0,
      }
      current.gamesCount += 1
      groupedRows.set(rowKey, current)

      const officeDayKey = `${dateStr}|${location}`
      totalGamesByOfficeDay.set(officeDayKey, (totalGamesByOfficeDay.get(officeDayKey) || 0) + 1)
    })

    const requirementRows = Array.from(groupedRows.values()).map((row) => {
      const dayTotalGames = totalGamesByOfficeDay.get(`${row.dateStr}|${row.location}`) || row.gamesCount
      const demandLevel = getDemandLevel(dayTotalGames)
      return {
        ...row,
        demandLevel,
        tradersNeeded: getTradersNeeded(row.sport, row.gamesCount, demandLevel),
        capabilityLevel: getCapabilityLevel(row.sport, row.gamesCount, demandLevel),
      }
    })

    const skillLookup = buildSkillLookup(traders)
    const { plans, ownerRequestsByRow } = buildWeek2Plans(traders, requirementRows, skillLookup)
    applyWeek2PreferenceAndRequestSeed(plans)

    requirementRows.forEach((row) => {
      const requestedTraderIds = ownerRequestsByRow.get(`${row.dateStr}|${row.location}|${row.sport}`) || []
      setOwnerDailyRequirement(row.dateStr, row.location, row.sport, {
        tradersNeeded: row.tradersNeeded,
        demandLevel: row.demandLevel,
        requestedTraderIds,
        capabilityLevel: row.capabilityLevel,
        confirmedAt: '2026-01-04T18:00:00.000Z',
      })
    })

    localStorage.setItem(SEED_MARKER_KEY, new Date().toISOString())
    console.info(
      `Seeded Week 2 2026 testing week (${weekGames.length} games, ${requirementRows.length} requirement rows).`
    )
  } catch (error) {
    console.warn('Failed to seed Week 2 2026 requirements:', error)
  }
}
