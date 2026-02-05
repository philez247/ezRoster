const STORAGE_KEY = 'ez-roster-traders'

const APP_USER_LEVELS = ['User', 'Owner', 'Manager', 'Admin']

function getTradersRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function saveTraders(traders) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(traders))
  } catch (e) {
    console.warn('Failed to save traders:', e)
  }
}

/** Generates a unique Trader ID (e.g. TR-1738...). */
export function generateTraderId() {
  const existing = getTradersRaw().map((t) => t.traderId)
  let id
  let attempts = 0
  do {
    id = 'TR-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6)
    attempts++
  } while (existing.includes(id) && attempts < 100)
  return id
}

/** Returns all traders (sorted by lastName, firstName). */
export function getTraders() {
  const list = getTradersRaw()
  return [...list].sort((a, b) => {
    const ln = (a.lastName || '').localeCompare(b.lastName || '')
    if (ln !== 0) return ln
    return (a.firstName || '').localeCompare(b.firstName || '')
  })
}

/** Returns one trader by traderId or undefined. */
export function getTraderById(traderId) {
  return getTradersRaw().find((t) => t.traderId === traderId)
}

/** Check if alias is taken by another trader (exclude optional traderId when editing). */
export function isAliasTaken(alias, excludeTraderId = null) {
  const trimmed = (alias || '').trim()
  if (!trimmed) return false
  const traders = getTradersRaw()
  return traders.some((t) => t.alias === trimmed && t.traderId !== excludeTraderId)
}

/** Seed data: 20 dummy traders (User, 40h/5d). Run once when store is empty. */
const SEED_TRADERS = [
  { firstName: 'Liam', lastName: "O'Connell", alias: 'OC7', location: 'Dublin' },
  { firstName: 'Sean', lastName: 'Murphy', alias: 'MurphX', location: 'Dublin' },
  { firstName: 'Aidan', lastName: 'Walsh', alias: 'AWol', location: 'Dublin' },
  { firstName: 'Conor', lastName: 'Byrne', alias: 'CBurn', location: 'Dublin' },
  { firstName: 'Eoin', lastName: 'Fitzgerald', alias: 'Fitz9', location: 'Dublin' },
  { firstName: 'Jack', lastName: 'Reynolds', alias: 'JRex', location: 'New Jersey' },
  { firstName: 'Mike', lastName: 'Donnelly', alias: 'DTrain', location: 'New Jersey' },
  { firstName: 'Chris', lastName: 'Novak', alias: 'CNova', location: 'New Jersey' },
  { firstName: 'Alex', lastName: 'Patterson', alias: 'Patch', location: 'New Jersey' },
  { firstName: 'Ryan', lastName: "O'Hara", alias: 'ROH', location: 'New Jersey' },
  { firstName: 'Ben', lastName: 'Carter', alias: 'BCar', location: 'Melbourne' },
  { firstName: 'Tom', lastName: 'Wilkins', alias: 'Wilko', location: 'Melbourne' },
  { firstName: 'Josh', lastName: 'Harding', alias: 'JHard', location: 'Melbourne' },
  { firstName: 'Matt', lastName: 'Coleman', alias: 'Coles', location: 'Melbourne' },
  { firstName: 'Luke', lastName: 'Spencer', alias: 'LSpin', location: 'Melbourne' },
  { firstName: 'Daniel', lastName: 'Keane', alias: 'DK', location: 'Dublin' },
  { firstName: 'Patrick', lastName: 'Nolan', alias: 'PN8', location: 'Dublin' },
  { firstName: 'Ethan', lastName: 'Brooks', alias: 'EBro', location: 'New Jersey' },
  { firstName: 'Sam', lastName: 'Fletcher', alias: 'Fletch', location: 'Melbourne' },
  { firstName: 'Noah', lastName: 'Grant', alias: 'NGrant', location: 'Melbourne' },
]

export function seedTradersIfEmpty() {
  const existing = getTradersRaw()
  const existingAliases = new Set(existing.map((t) => t.alias))
  const toAdd = SEED_TRADERS.filter((row) => !existingAliases.has(row.alias))
  if (toAdd.length === 0) return
  const base = Date.now()
  const newTraders = toAdd.map((row, i) => ({
    traderId: 'TR-seed-' + (base + i),
    firstName: row.firstName,
    lastName: row.lastName,
    alias: row.alias,
    location: row.location,
    active: true,
    appUserLevel: 'User',
    contractHours: 40,
    contractDays: 5,
    manager: '',
    weekendPct: '',
    inShiftPct: '',
  }))
  saveTraders([...existing, ...newTraders])
}

/** Default trader shape for new records. */
export function createBlankTrader() {
  return {
    traderId: generateTraderId(),
    firstName: '',
    lastName: '',
    alias: '',
    location: '',
    active: true,
    appUserLevel: 'User',
    contractHours: '',
    contractDays: '',
    manager: '',
    weekendPct: '',
    inShiftPct: '',
  }
}

/** Add a new trader. Returns updated list. */
export function addTrader(trader) {
  const list = getTradersRaw()
  if (list.some((t) => t.traderId === trader.traderId)) return list
  list.push({ ...trader })
  saveTraders(list)
  return getTraders()
}

/** Update existing trader by traderId. Returns updated list. */
export function updateTrader(traderId, updates) {
  const list = getTradersRaw()
  const idx = list.findIndex((t) => t.traderId === traderId)
  if (idx === -1) return getTraders()
  list[idx] = { ...list[idx], ...updates }
  saveTraders(list)
  return getTraders()
}

/** Delete trader by traderId. Returns updated list. */
export function deleteTrader(traderId) {
  const list = getTradersRaw().filter((t) => t.traderId !== traderId)
  saveTraders(list)
  return getTraders()
}

export { APP_USER_LEVELS }
