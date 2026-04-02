import { loadTraderDb, updateTraderDb } from './traderDb'
import { invalidateAllApprovedWeeks } from './allocationInvalidation'
import {
  getRequestStatusLabel,
  getRequestTypeLabel,
  normalizeRequestStatus,
  normalizeRequestType,
  REQUEST_STATUSES,
  REQUEST_TYPES,
} from '../domain/constants/preAllocation'
import { normalizeTraderRequest } from '../domain/traders/model'

function getRaw() {
  const db = loadTraderDb()
  return Object.values(db.traders).flatMap((p) => p.requests || [])
}

function generateId() {
  return 'AVL-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6)
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
  const record = normalizeTraderRequest({
    id,
    traderId,
    type: normalizeRequestType(type),
    fromDate,
    toDate: toDate || fromDate,
    note,
    status: 'PENDING',
  })
  updateTraderDb((db) => {
    if (!db.traders[traderId]) {
      db.traders[traderId] = {
        traderId,
        bio: { traderId },
        preferences: { ranges: [] },
        requests: [],
      }
    }
    if (!Array.isArray(db.traders[traderId].requests)) db.traders[traderId].requests = []
    db.traders[traderId].requests.push(record)
  })
  invalidateAllApprovedWeeks()
  return record
}

/** Update request status (for manager approval). */
export function updateRequestStatus(requestId, status) {
  const normalizedStatus = normalizeRequestStatus(status)
  if (normalizedStatus !== status) {
    const current = getRaw().find((r) => r.id === requestId)
    return current || null
  }
  let updated = null
  updateTraderDb((db) => {
    Object.values(db.traders).forEach((profile) => {
      if (!Array.isArray(profile.requests)) return
      const idx = profile.requests.findIndex((r) => r.id === requestId)
      if (idx < 0) return
      profile.requests[idx] = normalizeTraderRequest({ ...profile.requests[idx], status: normalizedStatus })
      updated = profile.requests[idx]
    })
  })
  if (updated) invalidateAllApprovedWeeks()
  return updated
}

/** Cancel a request (sets status to CANCELLED). */
export function cancelRequest(requestId) {
  return updateRequestStatus(requestId, 'CANCELLED')
}

/** True if trader has a DAY_OFF request covering this date (YYYY-MM-DD). For now we treat PENDING and CONFIRMED as approved (management approval not set up yet). */
export function isTraderOffOnDate(traderId, dateStr) {
  const override = getTraderDateRequestOverride(traderId, dateStr)
  return override?.type === 'DAY_OFF'
}

function dateInRange(dateStr, from, to) {
  if (!dateStr || dateStr.length < 10) return false
  const fromOk = !from || from.trim() === '' || from <= dateStr
  const toOk = !to || to.trim() === '' || to >= dateStr
  return fromOk && toOk
}

/** Active requests on a date (PENDING/CONFIRMED, not CANCELLED). */
export function getActiveRequestsByTraderIdOnDate(traderId, dateStr) {
  if (!traderId || !dateStr || dateStr.length < 10) return []
  return getRequestsByTraderId(traderId).filter(
    (r) => r.status !== 'CANCELLED' && dateInRange(dateStr, r.fromDate || '', r.toDate || '')
  )
}

/**
 * Resolve daily request override:
 * - DAY_OFF wins over DAY_IN if both exist
 * - otherwise DAY_IN marks trader available for that date
 */
export function getTraderDateRequestOverride(traderId, dateStr) {
  const active = getActiveRequestsByTraderIdOnDate(traderId, dateStr)
  if (active.length === 0) return null
  const off = active.find((r) => r.type === 'DAY_OFF')
  if (off) return { type: 'DAY_OFF', request: off }
  const dayIn = active.find((r) => r.type === 'DAY_IN')
  if (dayIn) return { type: 'DAY_IN', request: dayIn }
  return null
}

/** True if trader has a DAY_IN request covering this date (non-cancelled). */
export function isTraderInOnDate(traderId, dateStr) {
  const override = getTraderDateRequestOverride(traderId, dateStr)
  return override?.type === 'DAY_IN'
}

export {
  getRequestStatusLabel,
  getRequestTypeLabel,
  REQUEST_STATUSES,
  REQUEST_TYPES,
}
