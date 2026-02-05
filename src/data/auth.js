/**
 * Simple app auth: username/password, session stored in localStorage with 12h expiry.
 * Credentials are only checked on login; session contains username + expiresAt.
 */

const SESSION_KEY = 'ez-roster-session'
const SESSION_HOURS = 12

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
  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ username: u, expiresAt })
    )
    return true
  } catch {
    return false
  }
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
