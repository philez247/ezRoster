import { useState, useMemo, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getMasterGames } from '../data/birScheduleMaster'
import { gameKey, getAssignment, setAssignment, ASSIGNMENT_LOCATIONS } from '../data/birAssignments'
import { getTraders } from '../data/traders'
import { isTraderOffOnDate } from '../data/availabilityRequests'
import { getAvailabilityReport } from '../data/availabilityReport'
import layoutStyles from './Home.module.css'
import styles from './OwnersResources.module.css'

/** Get ISO week number (1-52) for a date. Week 1 = week containing Jan 4. */
function getISOWeek(d) {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 4 - (date.getDay() || 7))
  const yearStart = new Date(date.getFullYear(), 0, 1)
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7)
}

/** Get start (Monday) and end (Sunday) of ISO week N in year Y as YYYYMMDD. */
function weekRange(year, weekNum) {
  const jan4 = new Date(year, 0, 4)
  const dayOfWeek = jan4.getDay() || 7
  const mondayJan4 = new Date(jan4)
  mondayJan4.setDate(jan4.getDate() - dayOfWeek + 1)
  const weekStart = new Date(mondayJan4)
  weekStart.setDate(mondayJan4.getDate() + (weekNum - 1) * 7)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const toYmd = (d) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}${m}${day}`
  }
  return { start: toYmd(weekStart), end: toYmd(weekEnd) }
}

function gameDateEt(dateUtc) {
  if (!dateUtc) return ''
  try {
    return new Date(dateUtc).toLocaleDateString('en-CA', {
      timeZone: 'America/New_York',
    })
  } catch {
    return ''
  }
}

function formatDateEtCompact(dateUtc) {
  if (!dateUtc) return '—'
  try {
    const d = new Date(dateUtc)
    if (Number.isNaN(d.getTime())) return '—'
    const parts = new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/New_York',
    }).formatToParts(d)
    const get = (type) => parts.find((p) => p.type === type)?.value ?? ''
    return `ET: ${get('weekday')}, ${get('day')} ${get('month')} ${get('hour')}:${get('minute')}`
  } catch {
    return '—'
  }
}

function eventName(game) {
  const away = game?.awayTeam?.name || 'Away'
  const home = game?.homeTeam?.name || 'Home'
  return `${away} @ ${home}`
}

function formatDayLabel(dateStr) {
  if (!dateStr || dateStr.length < 10) return dateStr
  try {
    const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number)
    const date = new Date(y, m - 1, d)
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  } catch {
    return dateStr
  }
}

/** Slots needed per game (default 1). Can extend later. */
const SLOTS_PER_GAME = 1

/** Locations that match trader.location (Combo = any). */
const COMBO_LOCATIONS = ['Dublin', 'Melbourne', 'New Jersey']

const SPORTS = ['', 'NBA', 'NFL', 'NHL', 'WNBA', 'MLB', 'NCAAM']

const AVAILABILITY_STATUS_ORDER = ['no_preference', 'available', 'preferred_in', 'unavailable', 'preferred_off']
const AVAILABILITY_STATUS_LABELS = {
  no_preference: 'No Preference',
  available: 'In',
  preferred_in: 'Preferred In',
  unavailable: 'Off',
  preferred_off: 'Preferred Off',
}

/** Return [Mon, Tue, ..., Sun] as YYYY-MM-DD for the given week. */
function getSevenDaysForWeek(year, weekNum) {
  const { start } = weekRange(year, weekNum)
  if (!start || start.length < 8) return []
  const y = Number(start.slice(0, 4))
  const m = Number(start.slice(4, 6)) - 1
  const d = Number(start.slice(6, 8))
  const out = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(y, m, d + i)
    const yy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    out.push(`${yy}-${mm}-${dd}`)
  }
  return out
}

export default function OwnersResources() {
  const currentYear = new Date().getFullYear()
  const currentWeek = getISOWeek(new Date())
  const [year, setYear] = useState(currentYear)
  const [week, setWeek] = useState(currentWeek)
  const [selectedDay, setSelectedDay] = useState(null)
  const [games, setGames] = useState(() => getMasterGames())
  const [weekDropdownOpen, setWeekDropdownOpen] = useState(false)
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false)
  const [sportDropdownOpen, setSportDropdownOpen] = useState(false)
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false)
  const [sportFilter, setSportFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  // When sport or location is cleared, leave day detail so we're not viewing a day without context
  useEffect(() => {
    if ((!sportFilter || !locationFilter) && selectedDay) setSelectedDay(null)
  }, [sportFilter, locationFilter])
  const weekDropdownRef = useRef(null)
  const yearDropdownRef = useRef(null)
  const sportDropdownRef = useRef(null)
  const locationDropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (weekDropdownRef.current && !weekDropdownRef.current.contains(e.target)) setWeekDropdownOpen(false)
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(e.target)) setYearDropdownOpen(false)
      if (sportDropdownRef.current && !sportDropdownRef.current.contains(e.target)) setSportDropdownOpen(false)
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(e.target)) setLocationDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [])
  const [requestTraderFor, setRequestTraderFor] = useState(null) // { game, key }
  const [tradersNeededByDay, setTradersNeededByDay] = useState({}) // { [dateStr]: number }
  const [dayRankByDay, setDayRankByDay] = useState({}) // { [dateStr]: 'Busy' | 'Average' | 'Quiet' }
  const [requestTraderSelectValue, setRequestTraderSelectValue] = useState('')
  const [requirementsExpanded, setRequirementsExpanded] = useState(false)
  const [showViewSummary, setShowViewSummary] = useState(false)
  const [showWeekSummary, setShowWeekSummary] = useState(false)
  const [showFullWeekReport, setShowFullWeekReport] = useState(false)
  const [availabilityExpanded, setAvailabilityExpanded] = useState(false)
  const [gamesExpanded, setGamesExpanded] = useState(false)
  const [expandedGameKey, setExpandedGameKey] = useState(null)

  const DAY_LEVELS = ['Low', 'Medium', 'High']

  const refreshGames = () => setGames(getMasterGames())

  const filteredGames = useMemo(() => {
    const w = week
    const y = year
    const { start, end } = weekRange(y, w)
    if (!start || !end) return []

    return getMasterGames()
      .filter((g) => {
        const d = gameDateEt(g.dateUtc).replace(/-/g, '').replace(/[^0-9]/g, '')
        const ymd = d.length >= 8 ? d.slice(0, 8) : d
        return ymd >= start && ymd <= end
      })
      .sort((a, b) => (a.dateUtc || '').localeCompare(b.dateUtc || ''))
  }, [games, year, week])

  /** Games grouped by day, only games with a location assigned (need coverage). */
  const gamesByDay = useMemo(() => {
    const map = new Map()
    filteredGames.forEach((g) => {
      const key = gameKey(g.sport, g.gameId)
      const a = getAssignment(key)
      if (!a.location) return
      const d = gameDateEt(g.dateUtc).slice(0, 10)
      if (!map.has(d)) map.set(d, [])
      map.get(d).push(g)
    })
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredGames])

  /** Filter by sport and location; then 7 days (Mon–Sun) with games for each. */
  const sevenDaysWithGames = useMemo(() => {
    const byDate = new Map()
    gamesByDay.forEach(([dateStr, dayGames]) => {
      const filtered = dayGames.filter((g) => {
        if (sportFilter && (g.sport || '').toUpperCase() !== sportFilter.toUpperCase()) return false
        const a = getAssignment(gameKey(g.sport, g.gameId))
        if (locationFilter && (a.location || '') !== locationFilter) return false
        return true
      })
      if (filtered.length > 0) byDate.set(dateStr, filtered)
    })
    return getSevenDaysForWeek(year, week).map((dateStr) => [
      dateStr,
      byDate.get(dateStr) || [],
    ])
  }, [gamesByDay, year, week, sportFilter, locationFilter])

  /** Week summary: per-day stats for the weekly view. */
  const weekSummary = useMemo(() => {
    const days = sevenDaysWithGames
      .filter(([, dayGames]) => dayGames.length > 0)
      .map(([dateStr, dayGames]) => {
        let needed = 0
        let assigned = 0
        dayGames.forEach((g) => {
          const a = getAssignment(gameKey(g.sport, g.gameId))
          needed += SLOTS_PER_GAME
          assigned += (a.traders || []).length
        })
        const customNeeded = tradersNeededByDay[dateStr]
        const effectiveNeeded = customNeeded !== undefined ? customNeeded : needed
        return {
          dateStr,
          label: formatDayLabel(dateStr),
          games: dayGames.length,
          needed: effectiveNeeded,
          assigned,
          dayLevel: dayRankByDay[dateStr] || 'Medium',
        }
      })
    const totalGames = days.reduce((s, d) => s + d.games, 0)
    const totalNeeded = days.reduce((s, d) => s + d.needed, 0)
    const totalAssigned = days.reduce((s, d) => s + d.assigned, 0)
    return { days, totalGames, totalNeeded, totalAssigned }
  }, [sevenDaysWithGames, tradersNeededByDay, dayRankByDay])

  /** Full week report: all sports, all locations, no filters. */
  const fullWeekReport = useMemo(() => {
    const sevenDays = getSevenDaysForWeek(year, week)
    const byDate = new Map()
    gamesByDay.forEach(([dateStr, dayGames]) => {
      const bySportLoc = new Map()
      dayGames.forEach((g) => {
        const a = getAssignment(gameKey(g.sport, g.gameId))
        const loc = a.location || '—'
        const key = `${g.sport || ''}|${loc}`
        if (!bySportLoc.has(key)) bySportLoc.set(key, { sport: g.sport, location: loc, games: [], needed: 0, assigned: 0 })
        const entry = bySportLoc.get(key)
        entry.games.push(g)
        entry.needed += SLOTS_PER_GAME
        entry.assigned += (a.traders || []).length
      })
      byDate.set(dateStr, Array.from(bySportLoc.values()))
    })
    let totalGames = 0
    let totalAssigned = 0
    let totalNeeded = 0
    const days = sevenDays.map((dateStr) => {
      const rows = byDate.get(dateStr) || []
      rows.forEach((r) => {
        totalGames += r.games.length
        totalAssigned += r.assigned
        totalNeeded += r.needed
      })
      return { dateStr, label: formatDayLabel(dateStr), rows }
    }).filter((d) => d.rows.length > 0)
    return { days, totalGames, totalAssigned, totalNeeded }
  }, [gamesByDay, year, week])

  const traders = useMemo(() => getTraders().filter((t) => t.active !== false), [])

  /** For a date and location, return available traders (at that location, not off). */
  function getAvailableTraders(dateStr, location) {
    const locs = location === 'Combo' ? COMBO_LOCATIONS : [location]
    return traders.filter(
      (t) =>
        locs.includes(t.location) &&
        !isTraderOffOnDate(t.traderId, dateStr)
    )
  }

  const handleAddTrader = (game, traderId) => {
    const k = gameKey(game.sport, game.gameId)
    const a = getAssignment(k)
    const existing = a.traders || []
    if (existing.some((t) => t.traderId === traderId)) return
    setAssignment(k, {
      location: a.location,
      traders: [...existing, { traderId, roleNote: '' }],
    })
    refreshGames()
    setRequestTraderFor(null)
  }

  const handleRemoveTrader = (game, traderId) => {
    const k = gameKey(game.sport, game.gameId)
    const a = getAssignment(k)
    const next = (a.traders || []).filter((t) => t.traderId !== traderId)
    setAssignment(k, { location: a.location, traders: next })
    refreshGames()
  }

  const handleAddTraderForDay = (traderId) => {
    const target = firstGameNeedingTrader
    if (!target) return
    handleAddTrader(target.game, traderId)
  }

  const displayWeek = week
  const selectedDayEntry = sevenDaysWithGames.find(([d]) => d === selectedDay)
  const selectedDayGames = selectedDayEntry ? selectedDayEntry[1] : []
  const tradersNeededForSelectedDay =
    selectedDay && tradersNeededByDay[selectedDay] !== undefined
      ? tradersNeededByDay[selectedDay]
      : selectedDayGames.length
  const setTradersNeededForSelectedDay = (n) => {
    if (!selectedDay) return
    setTradersNeededByDay((prev) => ({ ...prev, [selectedDay]: Math.max(0, n) }))
  }
  /** First game with an open slot that a trader can fill (by location). */
  const firstGameNeedingTrader = useMemo(() => {
    if (!selectedDay) return null
    for (const game of selectedDayGames) {
      const k = gameKey(game.sport, game.gameId)
      const a = getAssignment(k)
      const slots = SLOTS_PER_GAME
      const assigned = (a.traders || []).length
      if (assigned < slots && a.location) return { game, key: k }
    }
    return null
  }, [selectedDay, selectedDayGames])
  /** Available traders for any game on this day (at locations that have open slots). */
  const availableTradersForDay = useMemo(() => {
    if (!selectedDay) return []
    const seen = new Set()
    const out = []
    for (const game of selectedDayGames) {
      const a = getAssignment(gameKey(game.sport, game.gameId))
      if (!a.location || (a.traders || []).length >= SLOTS_PER_GAME) continue
      const locs = a.location === 'Combo' ? COMBO_LOCATIONS : [a.location]
      for (const t of traders) {
        if (seen.has(t.traderId)) continue
        if (locs.includes(t.location) && !isTraderOffOnDate(t.traderId, selectedDay)) {
          seen.add(t.traderId)
          out.push(t)
        }
      }
    }
    return out
  }, [selectedDay, selectedDayGames, traders])

  /** Traders at the selected location for this day: available vs not available (off). */
  const tradersAvailabilityForDay = useMemo(() => {
    if (!selectedDay || !locationFilter) return { available: [], unavailable: [] }
    const locs = locationFilter === 'Combo' ? COMBO_LOCATIONS : [locationFilter]
    const atLocation = traders.filter((t) => locs.includes(t.location))
    const available = atLocation.filter((t) => !isTraderOffOnDate(t.traderId, selectedDay))
    const unavailable = atLocation.filter((t) => isTraderOffOnDate(t.traderId, selectedDay))
    return { available, unavailable }
  }, [selectedDay, locationFilter, traders])

  /** Availability report for selected day, filtered by location, grouped by status (for accordion). */
  const availabilityByStatus = useMemo(() => {
    if (!selectedDay || selectedDay.length < 10) return { byStatus: {}, locationLabel: '', total: 0 }
    const report = getAvailabilityReport(selectedDay)
    const locs = locationFilter === 'Combo' ? COMBO_LOCATIONS : (locationFilter ? [locationFilter] : [])
    const filtered = locs.length
      ? report.filter((row) => locs.includes(row.location))
      : report
    const byStatus = {}
    AVAILABILITY_STATUS_ORDER.forEach((s) => { byStatus[s] = [] })
    filtered.forEach((row) => {
      if (byStatus[row.status]) byStatus[row.status].push(row)
    })
    const locationLabel = locationFilter || 'All'
    const total = filtered.length
    return { byStatus, locationLabel, total }
  }, [selectedDay, locationFilter])

  const [expandedAvailabilityStatus, setExpandedAvailabilityStatus] = useState(() => new Set())
  const toggleAvailabilityStatus = (status) => {
    setExpandedAvailabilityStatus((prev) => {
      const next = new Set(prev)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }

  const dayRankForSelectedDay = selectedDay && dayRankByDay[selectedDay] !== undefined
    ? dayRankByDay[selectedDay]
    : 'Medium'
  const totalTradersAssignedForDay = useMemo(() => {
    return selectedDayGames.reduce(
      (sum, game) => sum + (getAssignment(gameKey(game.sport, game.gameId)).traders || []).length,
      0
    )
  }, [selectedDayGames])

  /** Traders assigned to games this day: { traderId, game } for removing from Request Trader list. */
  const assignedTradersForDay = useMemo(() => {
    const out = []
    selectedDayGames.forEach((game) => {
      const a = getAssignment(gameKey(game.sport, game.gameId))
      ;(a.traders || []).forEach((t) => out.push({ traderId: t.traderId, game }))
    })
    return out
  }, [selectedDayGames])
  const setDayRankForSelectedDay = (rank) => {
    if (!selectedDay) return
    setDayRankByDay((prev) => ({ ...prev, [selectedDay]: rank }))
  }

  // Resources home: filters + week day cards
  if (!selectedDay) {
    return (
      <main className={`${layoutStyles.page} ${styles.resourcesPage}`}>
        <div className={styles.resourcesContent}>
        <div className={styles.filterBar}>
          <div className={styles.filterGrid}>
          <div className={styles.filterGroup} ref={yearDropdownRef}>
            <div className={styles.customSelectWrap}>
              <button
                id="year-trigger"
                type="button"
                className={styles.filterSelect}
                onClick={() => {
                  setYearDropdownOpen((o) => !o)
                  setWeekDropdownOpen(false)
                }}
                aria-expanded={yearDropdownOpen}
                aria-haspopup="listbox"
              >
                <span className={styles.selectValue}>{year}</span>
                <span className={styles.selectChevron} aria-hidden>▾</span>
              </button>
              {yearDropdownOpen && (
                <ul className={styles.dropdownList} role="listbox">
                  {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                    <li key={y}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={year === y}
                        className={styles.dropdownOption}
                        onClick={() => {
                          setYear(y)
                          setYearDropdownOpen(false)
                        }}
                      >
                        {y}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className={styles.filterGroup} ref={weekDropdownRef}>
            <div className={styles.customSelectWrap}>
              <button
                id="week-trigger"
                type="button"
                className={styles.filterSelect}
                onClick={() => {
                  setWeekDropdownOpen((o) => !o)
                  setYearDropdownOpen(false)
                }}
                aria-expanded={weekDropdownOpen}
                aria-haspopup="listbox"
              >
                <span className={styles.selectValue}>Week {week}</span>
                <span className={styles.selectChevron} aria-hidden>▾</span>
              </button>
              {weekDropdownOpen && (
                <ul className={styles.dropdownList} role="listbox">
                  {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
                    <li key={w}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={week === w}
                        className={styles.dropdownOption}
                        onClick={() => {
                          setWeek(w)
                          setWeekDropdownOpen(false)
                        }}
                      >
                        Week {w}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className={styles.filterGroup} ref={sportDropdownRef}>
            <div className={styles.customSelectWrap}>
              <button
                id="sport-trigger"
                type="button"
                className={styles.filterSelect}
                onClick={() => {
                  setSportDropdownOpen((o) => !o)
                  setYearDropdownOpen(false)
                  setWeekDropdownOpen(false)
                  setLocationDropdownOpen(false)
                }}
                aria-expanded={sportDropdownOpen}
                aria-haspopup="listbox"
              >
                <span className={styles.selectValue}>{sportFilter || 'Sport'}</span>
                <span className={styles.selectChevron} aria-hidden>▾</span>
              </button>
              {sportDropdownOpen && (
                <ul className={styles.dropdownList} role="listbox">
                  {SPORTS.map((s) => (
                    <li key={s || '__ALL__'}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={sportFilter === s}
                        className={styles.dropdownOption}
                        onClick={() => {
                          setSportFilter(s)
                          setSportDropdownOpen(false)
                        }}
                      >
                        {s || 'All'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className={styles.filterGroup} ref={locationDropdownRef}>
            <div className={styles.customSelectWrap}>
              <button
                id="location-trigger"
                type="button"
                className={styles.filterSelect}
                onClick={() => {
                  setLocationDropdownOpen((o) => !o)
                  setYearDropdownOpen(false)
                  setWeekDropdownOpen(false)
                  setSportDropdownOpen(false)
                }}
                aria-expanded={locationDropdownOpen}
                aria-haspopup="listbox"
              >
                <span className={styles.selectValue}>{locationFilter || 'Location'}</span>
                <span className={styles.selectChevron} aria-hidden>▾</span>
              </button>
              {locationDropdownOpen && (
                <ul className={styles.dropdownList} role="listbox">
                  {['', ...ASSIGNMENT_LOCATIONS].map((loc) => (
                    <li key={loc || '__ALL__'}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={locationFilter === loc}
                        className={styles.dropdownOption}
                        onClick={() => {
                          setLocationFilter(loc)
                          setLocationDropdownOpen(false)
                        }}
                      >
                        {loc || 'All'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
          <div className={styles.viewWeekBtns}>
            <button
              type="button"
              className={styles.viewWeekBtn}
              onClick={() => setShowFullWeekReport(true)}
              disabled={fullWeekReport.days.length === 0}
            >
              View
            </button>
            <button
              type="button"
              className={styles.viewWeekBtn}
              onClick={() => setShowWeekSummary(true)}
              disabled={!sportFilter || !locationFilter || weekSummary.days.length === 0}
            >
              Week
            </button>
          </div>
        </div>
        <div className={styles.dayScrollWrap}>
          <div className={styles.dayCardList}>
            {!sportFilter || !locationFilter ? (
              <p className={styles.selectPrompt}>
                Select Sport and Location above to view day cards.
              </p>
            ) : (
            sevenDaysWithGames.map(([dateStr, dayGames]) => {
              let needed = 0
              let assigned = 0
              dayGames.forEach((g) => {
                const a = getAssignment(gameKey(g.sport, g.gameId))
                needed += SLOTS_PER_GAME
                assigned += (a.traders || []).length
              })

              return (
                <button
                  key={dateStr}
                  type="button"
                  className={styles.dayCard}
                  onClick={() => setSelectedDay(dateStr)}
                >
                  <div className={styles.dayCardMain}>
                    <div className={styles.dayCardTopRow}>
                      <span className={styles.dayLabel}>{formatDayLabel(dateStr)}</span>
                      <span className={styles.chevron} aria-hidden>
                        {dayGames.length === 0 ? '—' : '▶'}
                      </span>
                    </div>
                    <div className={styles.dayCardBottomRow}>
                      <span className={styles.dayMetaLeft}>Games: {dayGames.length}</span>
                      <span className={styles.dayMetaRight}>Assigned: {assigned}/{needed}</span>
                    </div>
                  </div>
                </button>
              )
            })
            )}
          </div>
        </div>
        </div>

        {showWeekSummary && (
          <div className={styles.viewSummaryOverlay} role="dialog" aria-modal="true" aria-label="Week summary">
            <div className={styles.viewSummaryPanel}>
              <h3 className={styles.viewSummaryTitle}>Week {week} Summary</h3>
              <div className={styles.viewSummaryContent}>
                <div className={styles.viewSummaryRow}>
                  <span className={styles.viewSummaryLabel}>Sport · Location:</span>
                  <span>{sportFilter || 'Sport'} · {locationFilter || 'Location'}</span>
                </div>
                <div className={styles.viewSummaryRow}>
                  <span className={styles.viewSummaryLabel}>Total Games:</span>
                  <span>{weekSummary.totalGames}</span>
                </div>
                <div className={styles.viewSummaryRow}>
                  <span className={styles.viewSummaryLabel}>Total Assigned:</span>
                  <span>{weekSummary.totalAssigned} / {weekSummary.totalNeeded}</span>
                </div>
                {weekSummary.days.map((d) => (
                  <div key={d.dateStr} className={styles.weekSummaryDay}>
                    <span className={styles.weekSummaryDayLabel}>{d.label}</span>
                    <span className={styles.weekSummaryDayMeta}>
                      Games: {d.games} · Assigned: {d.assigned}/{d.needed} · {d.dayLevel}
                    </span>
                  </div>
                ))}
              </div>
              <div className={styles.viewSummaryActions}>
                <button
                  type="button"
                  className={styles.viewSummarySubmitBtn}
                  onClick={() => setShowWeekSummary(false)}
                >
                  Submit
                </button>
                <button
                  type="button"
                  className={styles.viewSummaryCloseBtn}
                  onClick={() => setShowWeekSummary(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showFullWeekReport && (
          <div className={styles.viewSummaryOverlay} role="dialog" aria-modal="true" aria-label="Full week report">
            <div className={styles.fullWeekReportPanel}>
              <h3 className={styles.viewSummaryTitle}>Week {week} Report — All Sports & Locations</h3>
              <div className={styles.fullWeekReportContent}>
                <div className={styles.viewSummaryRow}>
                  <span className={styles.viewSummaryLabel}>Total Games:</span>
                  <span>{fullWeekReport.totalGames}</span>
                </div>
                <div className={styles.viewSummaryRow}>
                  <span className={styles.viewSummaryLabel}>Total Assigned:</span>
                  <span>{fullWeekReport.totalAssigned} / {fullWeekReport.totalNeeded}</span>
                </div>
                {fullWeekReport.days.map((d) => (
                  <div key={d.dateStr} className={styles.fullWeekReportDay}>
                    <span className={styles.weekSummaryDayLabel}>{d.label}</span>
                    {d.rows.map((r) => (
                      <div key={`${r.sport}-${r.location}`} className={styles.fullWeekReportRow}>
                        <span className={styles.fullWeekReportSportLoc}>{r.sport || '—'} · {r.location}</span>
                        <span className={styles.fullWeekReportMeta}>{r.games.length} games · {r.assigned}/{r.needed} assigned</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className={styles.viewSummaryActions}>
                <button
                  type="button"
                  className={styles.viewSummaryCloseBtn}
                  onClick={() => setShowFullWeekReport(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    )
  }

  // Day detail: specific sport + location; summary, traders needed, availability, rank, request traders, scrollable games
  return (
    <main className={`${layoutStyles.page} ${styles.dayDetailPage}`}>
      <div className={styles.dayDetailTopRow}>
        <div className={styles.dayDetailHeaderField} aria-readonly>
          <div className={styles.dayDetailHeaderRow1}>
            {selectedDay ? formatDayLabel(selectedDay) : ''}
          </div>
          <div className={styles.dayDetailHeaderRow2}>
            {sportFilter || 'Sport'} · {locationFilter || 'Location'}
          </div>
        </div>
        <div className={styles.dayDetailTopRightBtns}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => setSelectedDay(null)}
          >
            Back
          </button>
          <button
            type="button"
            className={styles.viewBtn}
            onClick={() => setShowViewSummary(true)}
          >
            View
          </button>
        </div>
      </div>

      {showViewSummary && (
        <div className={styles.viewSummaryOverlay} role="dialog" aria-modal="true" aria-label="Summary">
          <div className={styles.viewSummaryPanel}>
            <h3 className={styles.viewSummaryTitle}>Summary</h3>
            <div className={styles.viewSummaryContent}>
              <div className={styles.viewSummaryRow}>
                <span className={styles.viewSummaryLabel}>Date:</span>
                <span>{selectedDay ? formatDayLabel(selectedDay) : ''}</span>
              </div>
              <div className={styles.viewSummaryRow}>
                <span className={styles.viewSummaryLabel}>Sport · Location:</span>
                <span>{sportFilter || 'Sport'} · {locationFilter || 'Location'}</span>
              </div>
              <div className={styles.viewSummaryRow}>
                <span className={styles.viewSummaryLabel}>Traders Needed:</span>
                <span>{tradersNeededForSelectedDay}</span>
              </div>
              <div className={styles.viewSummaryRow}>
                <span className={styles.viewSummaryLabel}>Day Level:</span>
                <span>{dayRankForSelectedDay}</span>
              </div>
              <div className={styles.viewSummaryRow}>
                <span className={styles.viewSummaryLabel}>Traders Assigned:</span>
                <span>{totalTradersAssignedForDay}</span>
              </div>
              {assignedTradersForDay.length > 0 && (
                <div className={styles.viewSummaryRow}>
                  <span className={styles.viewSummaryLabel}>Requested:</span>
                  <span>
                    {[...new Set(assignedTradersForDay.map(({ traderId }) => traderId))].map((traderId) => {
                      const t = traders.find((tr) => tr.traderId === traderId)
                      return t
                        ? `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.alias || traderId
                        : traderId
                    }).join(', ')}
                  </span>
                </div>
              )}
              <div className={styles.viewSummaryRow}>
                <span className={styles.viewSummaryLabel}>Games:</span>
                <span>{selectedDayGames.length}</span>
              </div>
            </div>
            <div className={styles.viewSummaryActions}>
              <button
                type="button"
                className={styles.viewSummarySubmitBtn}
                onClick={() => {
                  setShowViewSummary(false)
                  /* Submit logic can be added here */
                }}
              >
                Submit
              </button>
              <button
                type="button"
                className={styles.viewSummaryCloseBtn}
                onClick={() => setShowViewSummary(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.dayDetailContent}>
        <div className={styles.daySummaryField} aria-readonly>
          <div className={styles.daySummaryLine}>Games: {selectedDayGames.length}</div>
          <div className={styles.daySummaryLine}>Traders Assigned: {totalTradersAssignedForDay}</div>
          <div className={styles.daySummaryLine}>Day Level: {dayRankForSelectedDay}</div>
        </div>

        <button
          type="button"
          className={styles.requirementsToggle}
          onClick={() => setRequirementsExpanded((e) => !e)}
          aria-expanded={requirementsExpanded}
        >
          <span>Requirements</span>
          <span className={styles.requirementsChevron} aria-hidden>
            {requirementsExpanded ? '▾' : '▶'}
          </span>
        </button>

        {requirementsExpanded && (
          <div className={styles.requirementsPanel}>
            <div className={styles.requirementsRow}>
              <label className={styles.requirementsLabel} htmlFor="traders-needed-input">
                Traders Needed
              </label>
              <input
                id="traders-needed-input"
                type="number"
                min={0}
                className={styles.requirementsInput}
                value={tradersNeededForSelectedDay}
                onChange={(e) => setTradersNeededForSelectedDay(parseInt(e.target.value, 10) || 0)}
              />
            </div>
            <div className={styles.requirementsRow}>
              <label className={styles.requirementsLabel} htmlFor="day-level-select">
                Day Level
              </label>
              <select
                id="day-level-select"
                className={styles.requirementsSelect}
                value={DAY_LEVELS.includes(dayRankForSelectedDay) ? dayRankForSelectedDay : 'Medium'}
                onChange={(e) => setDayRankForSelectedDay(e.target.value)}
                aria-label="Day level"
              >
                {DAY_LEVELS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
            <div className={styles.requirementsRow}>
              <label className={styles.requirementsLabel} htmlFor="request-trader-select">
                Request Trader
              </label>
              <div className={styles.requestTraderEntry}>
                <select
                  id="request-trader-select"
                  className={styles.requirementsSelect}
                  value={requestTraderSelectValue}
                  onChange={(e) => setRequestTraderSelectValue(e.target.value)}
                  disabled={availableTradersForDay.length === 0}
                  aria-label="Select a trader to request"
                >
                  <option value="">Select trader…</option>
                  {availableTradersForDay.map((t) => {
                    const name = `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.alias || t.traderId
                    return (
                      <option key={t.traderId} value={t.traderId}>
                        {name} ({t.location})
                      </option>
                    )
                  })}
                </select>
                <button
                  type="button"
                  className={styles.requestTraderAddBtn}
                  onClick={() => {
                    if (requestTraderSelectValue && firstGameNeedingTrader) {
                      handleAddTraderForDay(requestTraderSelectValue)
                      setRequestTraderSelectValue('')
                    }
                  }}
                  disabled={!requestTraderSelectValue || !firstGameNeedingTrader}
                  aria-label="Add trader"
                >
                  Add
                </button>
              </div>
            </div>
            {assignedTradersForDay.length > 0 && (
              <div className={styles.requestedTradersList}>
                {assignedTradersForDay.map(({ traderId, game }) => {
                  const t = traders.find((tr) => tr.traderId === traderId)
                  const name = t
                    ? `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.alias || traderId
                    : traderId
                  return (
                    <span key={`${game.gameId}-${traderId}`} className={styles.requestedTraderChip}>
                      {name}
                      <button
                        type="button"
                        className={styles.chipRemove}
                        onClick={() => handleRemoveTrader(game, traderId)}
                        aria-label={`Remove ${name}`}
                      >
                        ×
                      </button>
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          className={styles.requirementsToggle}
          onClick={() => setAvailabilityExpanded((e) => !e)}
          aria-expanded={availabilityExpanded}
        >
          <span>Availability</span>
          <span className={styles.requirementsChevron} aria-hidden>
            {availabilityExpanded ? '▾' : '▶'}
          </span>
        </button>

        {availabilityExpanded && (
          <div className={styles.requirementsPanel}>
            <div className={styles.availabilityStatusGroups}>
              {AVAILABILITY_STATUS_ORDER.map((status) => {
                const rows = availabilityByStatus.byStatus[status] || []
                const isStatusExpanded = expandedAvailabilityStatus.has(status)
                return (
                  <div
                    key={status}
                    className={styles.availabilityStatusBlock}
                    data-status={status}
                  >
                    <button
                      type="button"
                      className={styles.availabilityStatusHeader}
                      onClick={() => toggleAvailabilityStatus(status)}
                      aria-expanded={isStatusExpanded}
                    >
                      <span className={styles.availabilityStatusTitle}>
                        {AVAILABILITY_STATUS_LABELS[status]}
                        <span className={styles.availabilityCount}> ({rows.length})</span>
                      </span>
                      <span
                        className={styles.availabilityStatusChevron}
                        aria-hidden
                        data-open={isStatusExpanded}
                      >
                        ▼
                      </span>
                    </button>
                    {isStatusExpanded && rows.length > 0 && (
                      <ul className={styles.availabilityTraderList}>
                        {rows.map((row) => (
                          <li key={row.traderId} className={styles.availabilityRow}>
                            <div className={styles.availabilityRowLeft}>
                              <Link
                                to={`/traders/${row.traderId}`}
                                className={styles.availabilityName}
                              >
                                {row.name}
                              </Link>
                              {row.alias && (
                                <span className={styles.availabilityAlias}>{row.alias}</span>
                              )}
                            </div>
                            <span
                              className={
                                row.source === 'REQUEST'
                                  ? styles.availabilityBadgeRequest
                                  : styles.availabilityBadgePreference
                              }
                            >
                              {row.source === 'REQUEST' ? 'Request' : 'Preference'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          className={styles.requirementsToggle}
          onClick={() => setGamesExpanded((e) => !e)}
          aria-expanded={gamesExpanded}
        >
          <span>Games</span>
          <span className={styles.requirementsChevron} aria-hidden>
            {gamesExpanded ? '▾' : '▶'}
          </span>
        </button>

        {gamesExpanded && (
          <div className={`${styles.requirementsPanel} ${styles.gamesPanel}`}>
        <div className={styles.gamesScrollWindow}>
        {selectedDayGames.length === 0 ? (
          <p className={styles.empty}>No games needing coverage on this day.</p>
        ) : (
          <ul className={styles.gameList}>
            {selectedDayGames.map((game) => {
              const k = gameKey(game.sport, game.gameId)
              const a = getAssignment(k)
              const assignedTraders = a.traders || []
              const slots = SLOTS_PER_GAME
              const available = getAvailableTraders(selectedDay, a.location)
              const isRequesting = requestTraderFor?.key === k
              const isExpanded = expandedGameKey === k

              return (
                <li key={k} className={styles.gameCard}>
                  <button
                    type="button"
                    className={styles.gameCardOneLine}
                    onClick={() => setExpandedGameKey(isExpanded ? null : k)}
                  >
                    <span className={styles.gameCardEventName}>{eventName(game)}</span>
                  </button>
                  {isExpanded && (
                    <div className={styles.gameCardDetails}>
                      <div className={styles.gameCardHeader}>
                        <span className={styles.gameSport}>{game.sport}</span>
                        <span className={styles.gameEvent}>{eventName(game)}</span>
                        <span className={styles.gameTime}>{formatDateEtCompact(game.dateUtc)}</span>
                        <span className={styles.gameLocation}>{a.location}</span>
                      </div>
                      <div className={styles.tradersSection}>
                        <div className={styles.tradersNeeded}>
                          <span className={styles.tradersLabel}>
                            Traders ({assignedTraders.length}/{slots}):
                          </span>
                          {assignedTraders.map((t) => {
                            const trader = traders.find((tr) => tr.traderId === t.traderId)
                            const name = trader
                              ? `${trader.firstName || ''} ${trader.lastName || ''}`.trim() || trader.alias || t.traderId
                              : t.traderId
                            return (
                              <span key={t.traderId} className={styles.traderChip}>
                                {name}
                                <button
                                  type="button"
                                  className={styles.chipRemove}
                                  onClick={() => handleRemoveTrader(game, t.traderId)}
                                  aria-label={`Remove ${name}`}
                                >
                                  ×
                                </button>
                              </span>
                            )
                          })}
                          {assignedTraders.length < slots && (
                            <button
                              type="button"
                              className={styles.requestBtn}
                              onClick={() => setRequestTraderFor({ game, key: k })}
                            >
                              + Request trader
                            </button>
                          )}
                        </div>
                        {isRequesting && (
                          <div className={styles.availableList}>
                            <span className={styles.availableLabel}>Available:</span>
                            {available.length === 0 ? (
                              <span className={styles.noAvailable}>None available</span>
                            ) : (
                              available.map((t) => {
                                const name = `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.alias || t.traderId
                                return (
                                  <button
                                    key={t.traderId}
                                    type="button"
                                    className={styles.availableItem}
                                    onClick={() => handleAddTrader(game, t.traderId)}
                                  >
                                    {name} <span className={styles.traderLoc}>({t.location})</span>
                                  </button>
                                )
                              })
                            )}
                            <button
                              type="button"
                              className={styles.cancelRequest}
                              onClick={() => setRequestTraderFor(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          )}
        </div>
          </div>
        )}
      </div>
    </main>
  )
}
