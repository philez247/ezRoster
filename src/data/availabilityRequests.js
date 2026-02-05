const STORAGE_KEY = 'ez-roster-availability-requests'

export const REQUEST_TYPES = [
  { value: 'DAY_OFF', label: 'Day Off' },
  { value: 'DAY_IN', label: 'Day In' },
]

export const REQUEST_STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

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
    console.warn('Failed to save availability requests:', e)
  }
}

function generateId() {
  return 'AVL-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6)
}

/** Get request type label. */
export function getRequestTypeLabel(value) {
  const opt = REQUEST_TYPES.find((o) => o.value === value)
  return opt ? opt.label : value || 'Day Off'
}

/** Get request status label. */
export function getRequestStatusLabel(value) {
  const opt = REQUEST_STATUSES.find((o) => o.value === value)
  return opt ? opt.label : value || 'Pending'
}

/** Get all requests for a trader, sorted by fromDate descending. */
export function getRequestsByTraderId(traderId) {
  const list = getRaw().filter((r) => r.traderId === traderId)
  return [...list].sort((a, b) => {
    const da = a.fromDate || ''
    const db = b.fromDate || ''
    return db.localeCompare(da) // newest first
  })
}

/** Create a new availability request. Default status is PENDING. */
export function createRequest(traderId, { type = 'DAY_OFF', fromDate, toDate, note }) {
  const id = generateId()
  const from = (fromDate || '').trim()
  const to = (toDate || from).trim()
  const record = {
    id,
    traderId,
    type: type === 'DAY_IN' ? 'DAY_IN' : 'DAY_OFF',
    fromDate: from,
    toDate: to,
    note: (note || '').trim(),
    status: 'PENDING',
  }
  const list = getRaw()
  list.push(record)
  save(list)
  return record
}

/** Update request status (for manager approval). */
export function updateRequestStatus(requestId, status) {
  const list = getRaw()
  const idx = list.findIndex((r) => r.id === requestId)
  if (idx < 0) return null
  const valid = ['PENDING', 'CONFIRMED', 'CANCELLED']
  if (!valid.includes(status)) return list[idx]
  list[idx] = { ...list[idx], status }
  save(list)
  return list[idx]
}

/** Cancel a request (sets status to CANCELLED). */
export function cancelRequest(requestId) {
  return updateRequestStatus(requestId, 'CANCELLED')
}

/** True if trader has a DAY_OFF request covering this date (YYYY-MM-DD). For now we treat PENDING and CONFIRMED as approved (management approval not set up yet). */
export function isTraderOffOnDate(traderId, dateStr) {
  const list = getRaw()
  return list.some(
    (r) =>
      r.traderId === traderId &&
      r.type === 'DAY_OFF' &&
      r.status !== 'CANCELLED' &&
      dateInRange(dateStr, r.fromDate || '', r.toDate || '')
  )
}

function dateInRange(dateStr, from, to) {
  const fromOk = !from || from.trim() === '' || from <= dateStr
  const toOk = !to || to.trim() === '' || to >= dateStr
  return fromOk && toOk
}
