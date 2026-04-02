import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import {
  isAuthenticated as checkAuth,
  login as authLogin,
  logout as authLogout,
  getActiveTraderId as readActiveTraderId,
  setActiveTraderId as writeActiveTraderId,
} from '../data/auth'

const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }) {
  const [authenticated, setAuthenticated] = useState(() => checkAuth())
  const [activeTraderId, setActiveTraderIdState] = useState(() => readActiveTraderId())

  const login = useCallback((username, password) => {
    const ok = authLogin(username, password)
    if (ok) {
      setAuthenticated(true)
      setActiveTraderIdState(readActiveTraderId())
    }
    return ok
  }, [])

  const logout = useCallback(() => {
    authLogout()
    setAuthenticated(false)
    setActiveTraderIdState(null)
  }, [])

  const setActiveTraderId = useCallback((traderId) => {
    const ok = writeActiveTraderId(traderId)
    if (ok) setActiveTraderIdState(traderId || null)
    return ok
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      if (!checkAuth()) {
        setAuthenticated(false)
        setActiveTraderIdState(null)
        return
      }
      setAuthenticated(true)
      setActiveTraderIdState(readActiveTraderId())
    }, 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <AuthContext.Provider
      value={{ isAuthenticated: authenticated, login, logout, activeTraderId, setActiveTraderId }}
    >
      {children}
    </AuthContext.Provider>
  )
}
