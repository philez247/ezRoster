import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { isAuthenticated as checkAuth, login as authLogin, logout as authLogout } from '../data/auth'

const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }) {
  const [authenticated, setAuthenticated] = useState(() => checkAuth())

  const login = useCallback((username, password) => {
    const ok = authLogin(username, password)
    if (ok) setAuthenticated(true)
    return ok
  }, [])

  const logout = useCallback(() => {
    authLogout()
    setAuthenticated(false)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      if (!checkAuth()) setAuthenticated(false)
    }, 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated: authenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
