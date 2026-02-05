const STORAGE_KEY = 'ez-roster-trader-skills'

const TYPES = ['primary', 'secondary']
const LEVELS = [1, 2, 3]

function getRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function save(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
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
  list.push({
    id: generateId(),
    traderId,
    sport: (sport || '').trim(),
    type: type === 'secondary' ? 'secondary' : 'primary',
    level: level === 2 ? 2 : level === 3 ? 3 : 1,
  })
  save(list)
  return getSkillsByTraderId(traderId)
}

/** Update a skill assignment by id. */
export function updateSkill(id, updates) {
  const list = getRaw()
  const idx = list.findIndex((s) => s.id === id)
  if (idx === -1) return list
  list[idx] = { ...list[idx], ...updates }
  if (updates.sport !== undefined) list[idx].sport = (list[idx].sport || '').trim()
  if (updates.type !== undefined)
    list[idx].type = updates.type === 'secondary' ? 'secondary' : 'primary'
  if (updates.level !== undefined)
    list[idx].level = updates.level === 2 ? 2 : updates.level === 3 ? 3 : 1
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

export { TYPES, LEVELS }
