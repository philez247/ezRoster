import {
  SKILL_LEVELS as LEVELS,
  SKILL_TYPES as TYPES,
} from '../domain/constants/preAllocation'
import { normalizeTraderSkill } from '../domain/traders/model'

const STORAGE_KEY = 'ez-roster-trader-skills'

function getRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data.map(normalizeTraderSkill) : []
  } catch {
    return []
  }
}

function save(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify((list || []).map(normalizeTraderSkill)))
  } catch (e) {
    console.warn('Failed to save trader skills:', e)
  }
}

function generateId() {
  return 'SK-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6)
}

/** Get all skill assignments for a trader. */
export function getSkillsByTraderId(traderId) {
  return getRaw()
    .filter((s) => s.traderId === traderId)
    .sort((a, b) => {
      const typeOrder = a.type === 'primary' ? 0 : 1
      const typeOrderB = b.type === 'primary' ? 0 : 1
      if (typeOrder !== typeOrderB) return typeOrder - typeOrderB
      return (a.sport || '').localeCompare(b.sport || '')
    })
}

/** Add a skill assignment. */
export function addSkill(traderId, sport, type, level) {
  const list = getRaw()
  list.push(normalizeTraderSkill({
    id: generateId(),
    traderId,
    sport,
    type,
    level,
  }))
  save(list)
  return getSkillsByTraderId(traderId)
}

/** Update a skill assignment by id. */
export function updateSkill(id, updates) {
  const list = getRaw()
  const idx = list.findIndex((s) => s.id === id)
  if (idx === -1) return list
  list[idx] = normalizeTraderSkill({ ...list[idx], ...updates })
  save(list)
  return list
}

/** Remove a skill assignment by id. */
export function removeSkill(id) {
  const list = getRaw().filter((s) => s.id !== id)
  save(list)
  return list
}

/** Get all skills (for grouping traders by sport/capability later). */
export function getAllSkills() {
  return getRaw()
}

export function replaceAllSkills(skills) {
  save(Array.isArray(skills) ? skills.map(normalizeTraderSkill) : [])
  return getAllSkills()
}

export { TYPES, LEVELS }
