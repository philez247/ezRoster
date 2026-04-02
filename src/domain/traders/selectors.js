import { loadTraderDb } from '../../data/traderDb'
import { getAllSkills } from '../../data/traderSkills'
import { normalizeSportCode } from '../constants/preAllocation'
import { normalizeTrader, validateTrader } from './model'

function groupSkillsByTrader(skills = []) {
  return skills.reduce((map, skill) => {
    const traderId = skill?.traderId || ''
    if (!traderId) return map
    if (!map.has(traderId)) map.set(traderId, [])
    map.get(traderId).push(skill)
    return map
  }, new Map())
}

export function getTraderRecords() {
  const db = loadTraderDb()
  const skillsByTrader = groupSkillsByTrader(getAllSkills())
  return Object.values(db.traders)
    .map((profile) => normalizeTrader({
      ...profile,
      skills: skillsByTrader.get(profile?.traderId) || [],
    }))
    .sort((left, right) => (
      (left.bio.lastName || '').localeCompare(right.bio.lastName || '') ||
      (left.bio.firstName || '').localeCompare(right.bio.firstName || '')
    ))
}

export function getTraderRecordById(traderId) {
  return getTraderRecords().find((trader) => trader.traderId === traderId) || null
}

export function getActiveTraders({ location } = {}) {
  return getTraderRecords().filter((trader) => {
    if (trader.active === false) return false
    if (location && trader.homeLocation !== location) return false
    return true
  })
}

export function buildTraderSkillLookup(traders = getTraderRecords()) {
  const byTraderSport = new Map()

  traders.forEach((trader) => {
    trader.skills.forEach((skill) => {
      const sport = normalizeSportCode(skill.sport, { allowOther: true })
      const key = `${trader.traderId}|${sport}`
      const previous = byTraderSport.get(key) || { level: 0, primary: false }
      byTraderSport.set(key, {
        level: Math.max(previous.level, skill.level || 0),
        primary: previous.primary || skill.type === 'primary',
      })
    })
  })

  return {
    getLevel(traderId, sport) {
      return byTraderSport.get(`${traderId}|${normalizeSportCode(sport, { allowOther: true })}`)?.level || 0
    },
    isPrimary(traderId, sport) {
      return byTraderSport.get(`${traderId}|${normalizeSportCode(sport, { allowOther: true })}`)?.primary || false
    },
  }
}

export function getEligibleTradersForSport({ sport, location, minLevel = 1, includeInactive = false } = {}) {
  const lookup = buildTraderSkillLookup()
  return getTraderRecords().filter((trader) => {
    if (!includeInactive && trader.active === false) return false
    if (location && trader.homeLocation !== location) return false
    return lookup.getLevel(trader.traderId, sport) >= minLevel
  })
}

export function findTraderDataIssues({ locations = [], sports = [] } = {}) {
  return getTraderRecords().flatMap((trader) => {
    const result = validateTrader(trader, { locations, sports })
    return [...result.errors, ...result.warnings].map((message) => ({
      traderId: trader.traderId,
      name: trader.name,
      severity: result.errors.includes(message) ? 'error' : 'warning',
      message,
    }))
  })
}
