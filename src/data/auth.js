/**
 * Simple app auth: username/password, session stored in localStorage with 12h expiry.
 * Credentials are only checked on login; session contains username + expiresAt + activeTraderId.
 */

import { loadTraderDb } from './traderDb'

const SESSION_KEY = 'ez-roster-session'
const SESSION_HOURS = 12
export const ADMIN_USER_ID = '__ADMIN__'
export const DEVELOPER_USER_ID = '__DEVELOPER__'

const CREDENTIALS = {
  username: 'philEz',
  password: 'Moycullen',
}

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || !data.expiresAt) return null
    if (Date.now() >= data.expiresAt) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return data
  } catch {
    return null
  }
}

function saveSession(session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    return true
  } catch {
    return false
  }
}

function isValidTraderSelection(traderId) {
  if (!traderId || traderId === DEVELOPER_USER_ID || traderId === ADMIN_USER_ID) return true
  try {
    const db = loadTraderDb()
    return !!db?.traders?.[traderId]
  } catch {
    return false
  }
}

/** Returns true if user has a valid (non-expired) session. */
export function isAuthenticated() {
  return getSession() !== null
}

/**
 * Attempt login. Returns true if credentials match and session was set.
 * Session expires in 12 hours.
 */
export function login(username, password) {
  const u = (username || '').trim()
  const p = (password || '').trim()
  if (u !== CREDENTIALS.username || p !== CREDENTIALS.password) {
    return false
  }
  const expiresAt = Date.now() + SESSION_HOURS * 60 * 60 * 1000
  return saveSession({ username: u, expiresAt, activeTraderId: DEVELOPER_USER_ID })
}

/** Clear session (sign out). */
export function logout() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}

/** Get current session username if authenticated. */
export function getUsername() {
  const s = getSession()
  return s ? s.username : null
}

/** Get currently selected trader if authenticated. */
export function getActiveTraderId() {
  const s = getSession()
  const activeTraderId = s?.activeTraderId || DEVELOPER_USER_ID
  if (!s) return DEVELOPER_USER_ID
  if (isValidTraderSelection(activeTraderId)) return activeTraderId

  saveSession({
    ...s,
    activeTraderId: DEVELOPER_USER_ID,
  })
  return DEVELOPER_USER_ID
}

/** Update currently selected trader in the active session. */
export function setActiveTraderId(traderId) {
  const s = getSession()
  if (!s) return false
  return saveSession({
    ...s,
    activeTraderId: traderId || DEVELOPER_USER_ID,
  })
}
