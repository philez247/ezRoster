import { useState, useMemo, useRef, useEffect } from 'react'
import { getMasterGames } from '../data/birScheduleMaster'
import { gameKey, getAssignment, setAssignment, ASSIGNMENT_LOCATIONS } from '../data/birAssignments'
import { getWeekSummary } from '../data/weekSweep'
import { formatDatePhone } from '../utils/dateFormat'
import styles from './OwnersCoverage.module.css'

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
  const dayOfWeek = jan4.getDay() || 7 // 1=Mon, 7=Sun
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

function dateEt(game) {
  return formatDatePhone(game?.dateUtc, 'America/New_York')
}

function formatTimes(dateUtc) {
  if (!dateUtc) return { et: '—', dub: '—', melb: '—' }
  return {
    et: formatDatePhone(dateUtc, 'America/New_York'),
    dub: formatDatePhone(dateUtc, 'Europe/Dublin'),
    melb: formatDatePhone(dateUtc, 'Australia/Melbourne'),
  }
}

/** Format date as "ET: ddd, dd mmm HH:mm" (e.g. "ET: Mon, 2 Feb 15:00"). */
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

/** Format week date range as "Jan 2 – Jan 8" (from weekRange start/end YYYYMMDD). */
function formatWeekDateRange(year, weekNum) {
  const { start, end } = weekRange(year, weekNum)
  if (!start || !end || start.length < 8 || end.length < 8) return ''
  try {
    const startDate = new Date(
      Number(start.slice(0, 4)),
      Number(start.slice(4, 6)) - 1,
      Number(start.slice(6, 8))
    )
    const endDate = new Date(
      Number(end.slice(0, 4)),
      Number(end.slice(4, 6)) - 1,
      Number(end.slice(6, 8))
    )
    const startStr = startDate.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
    const endStr = endDate.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
    return `${startStr} – ${endStr}`
  } catch {
    return ''
  }
}

/** Format date string YYYY-MM-DD as "Mon 6 Jan" (ET). */
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

/** Format date string YYYY-MM-DD as "Mon 29 Dec 25" (ddd dd mmm yy). */
function formatDayLabelWithYear(dateStr) {
  if (!dateStr || dateStr.length < 10) return dateStr
  try {
    const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number)
    const date = new Date(y, m - 1, d)
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' })
  } catch {
    return dateStr
  }
}

const SPORTS = ['', 'NBA', 'NFL', 'NHL', 'WNBA', 'MLB', 'NCAAM']
const WEEKS = Array.from({ length: 52 }, (_, i) => i + 1)

/** Format progress summary for a week card (Completed, Archived, In Progress, Pending only; no No Info). */
function ProgressSummary({ summary }) {
  const parts = []
  if (summary['Completed'] > 0) parts.push({ key: 'c', className: styles.completed, text: `${summary['Completed']} Completed` })
  if (summary['Archived'] > 0) parts.push({ key: 'a', className: styles.archived, text: `${summary['Archived']} Archived` })
  if (summary['In Progress'] > 0) parts.push({ key: 'i', className: styles.inProgress, text: `${summary['In Progress']} In Progress` })
  if (summary['Pending'] > 0) parts.push({ key: 'p', className: styles.pending, text: `${summary['Pending']} Pending` })
  if (parts.length === 0) return null
  return (
    <>
      {parts.map((p, i) => (
        <span key={p.key}>
          {i > 0 && ' · '}
          <span className={p.className}>{p.text}</span>
        </span>
      ))}
    </>
  )
}

export default function OwnersCoverage() {
  const currentYear = new Date().getFullYear()
  const currentWeek = getISOWeek(new Date())
  const [year, setYear] = useState(currentYear)
  const [week, setWeek] = useState(currentWeek)
  const [weekFilter, setWeekFilter] = useState('') // '' = All Weeks, or 1-52 to filter cards
  const [selectedWeek, setSelectedWeek] = useState(null) // null = coverage home (cards), number = week detail
  const [sportFilter, setSportFilter] = useState('')
  const [games, setGames] = useState(() => getMasterGames())
  const [selectedDay, setSelectedDay] = useState(null) // dateStr (YYYY-MM-DD) = day detail view; null = week view with day list
  const [selectedGameForDetail, setSelectedGameForDetail] = useState(null) // game object for detail modal
  const [showDayReportModal, setShowDayReportModal] = useState(false)
  const currentWeekCardRef = useRef(null)
  const scrollWrapRef = useRef(null)

  const refreshGames = () => setGames(getMasterGames())

  const filteredGames = useMemo(() => {
    const w = selectedWeek ?? week
    const y = year
    const { start, end } = weekRange(y, w)
    if (!start || !end) return []

    let list = getMasterGames().filter((g) => {
      const d = gameDateEt(g.dateUtc).replace(/-/g, '').replace(/[^0-9]/g, '')
      const ymd = d.length >= 8 ? d.slice(0, 8) : d
      return ymd >= start && ymd <= end
    })

    if (sportFilter) {
      const upper = sportFilter.toUpperCase()
      list = list.filter((g) => (g.sport || '').toUpperCase() === upper)
    }

    return list.sort((a, b) => (a.dateUtc || '').localeCompare(b.dateUtc || ''))
  }, [games, year, week, selectedWeek, sportFilter])

  /** Games grouped by day (date string YYYY-MM-DD in ET), sorted chronologically. */
  const gamesByDay = useMemo(() => {
    const map = new Map()
    filteredGames.forEach((g) => {
      const d = gameDateEt(g.dateUtc).slice(0, 10)
      if (!map.has(d)) map.set(d, [])
      map.get(d).push(g)
    })
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredGames])

  const handleLocationChange = (game, location) => {
    const key = gameKey(game.sport, game.gameId)
    const a = getAssignment(key)
    setAssignment(key, {
      location: location || null,
      traders: a.traders,
    })
    refreshGames()
  }

  const displayWeek = selectedWeek ?? week

  // Scroll to current week card when on coverage home with all weeks
  useEffect(() => {
    if (selectedWeek === null && weekFilter === '' && year === currentYear && currentWeekCardRef.current) {
      currentWeekCardRef.current.scrollIntoView({ block: 'start', behavior: 'auto' })
    }
  }, [selectedWeek, weekFilter, year, currentYear])

  // Coverage home: week cards (1–52)
  if (selectedWeek === null) {
    return (
      <main className={styles.page}>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <select
              id="year-select-home"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className={styles.filterSelect}
              aria-label="Year"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <select
              id="week-select-home"
              value={weekFilter}
              onChange={(e) => setWeekFilter(e.target.value === '' ? '' : Number(e.target.value))}
              className={styles.filterSelect}
              aria-label="Filter by week"
            >
              <option value="">All Weeks</option>
              {WEEKS.map((w) => (
                <option key={w} value={w}>
                  Week {w}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div ref={scrollWrapRef} className={styles.scrollWrap}>
          <div className={styles.weekCards}>
            {(weekFilter === '' ? WEEKS : [weekFilter]).map((w) => {
              const summary = getWeekSummary(year, w)
              const dateRange = formatWeekDateRange(year, w)
              const isCurrentWeek = year === currentYear && w === currentWeek
              return (
                <button
                  key={w}
                  ref={isCurrentWeek ? currentWeekCardRef : undefined}
                  type="button"
                  className={`${styles.weekCard} ${isCurrentWeek ? styles.weekCardCurrent : ''}`}
                  onClick={() => {
                    setWeek(w)
                    setSelectedWeek(w)
                  }}
                  aria-label={`Week ${w}${dateRange ? `, ${dateRange}` : ''}, open week detail`}
                >
                  <div className={styles.weekCardTopRow}>
                    <span className={styles.weekCardTitle}>Week {w}</span>
                    {dateRange && (
                      <span className={styles.weekCardDates}>{dateRange}</span>
                    )}
                  </div>
                  {(summary['Completed'] + summary['Archived'] + summary['In Progress'] + summary['Pending'] > 0) && (
                    <div className={styles.weekCardProgress}>
                      <ProgressSummary summary={summary} />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </main>
    )
  }

  // Day detail: selected day at top, scrollable games below (more space)
  const weekDateRange = formatWeekDateRange(year, displayWeek)
  const selectedDayEntry = gamesByDay.find(([d]) => d === selectedDay)
  const selectedDayGames = selectedDayEntry ? selectedDayEntry[1] : []

  if (selectedDay) {
    const assigned = selectedDayGames.filter(
      (g) => getAssignment(gameKey(g.sport, g.gameId)).location
    ).length
    const total = selectedDayGames.length
    return (
      <main className={styles.page}>
        <div className={styles.dayDetailTopRow}>
          <div
            role="button"
            tabIndex={0}
            className={styles.dayDetailLeftField}
            aria-label="Week, date range and games assigned. Click for day report."
            onClick={() => setShowDayReportModal(true)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowDayReportModal(true) } }}
          >
            <div className={styles.dayDetailLine1}>
              W {displayWeek}, {formatDayLabelWithYear(selectedDay)}
            </div>
            <div className={styles.dayDetailLine2}>
              games: {total}       Assigned: {assigned}
            </div>
          </div>
          <button
            type="button"
            className={styles.dayDetailBackBtn}
            onClick={() => setSelectedDay(null)}
          >
            Back
          </button>
        </div>
        <div className={styles.dayDetailScroll}>
          {selectedDayGames.length > 0 ? (
            <div className={styles.gameList}>
              {selectedDayGames.map((game) => {
                const key = gameKey(game.sport, game.gameId)
                const a = getAssignment(key)
                return (
                  <div
                    key={key}
                    role="button"
                    tabIndex={0}
                    className={styles.gameRow}
                    onClick={() => setSelectedGameForDetail(game)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedGameForDetail(game) } }}
                  >
                    <div className={styles.gameInfo}>
                      <div className={styles.gameCardTopRow}>
                        {game.sport || '—'} – {eventName(game)}
                      </div>
                      <div className={styles.gameCardBottomRow}>
                        <span className={styles.gameCardMeta}>
                          {formatDateEtCompact(game.dateUtc)}
                        </span>
                        <div className={styles.locationWrap} onClick={(e) => e.stopPropagation()}>
                          <label htmlFor={`location-${key}`} className={styles.srOnly}>
                            Assign location for {eventName(game)}
                          </label>
                          <select
                            id={`location-${key}`}
                            value={a.location || ''}
                            onChange={(e) => handleLocationChange(game, e.target.value)}
                            className={`${styles.locationSelect} ${a.location ? styles.locationSelectAssigned : styles.locationSelectPending}`}
                          >
                            <option value="">Pending</option>
                            {ASSIGNMENT_LOCATIONS.map((loc) => (
                              <option key={loc} value={loc}>
                                {loc}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className={styles.empty}>No games on this day.</p>
          )}
        </div>

        {showDayReportModal && (
          <div
            className={styles.modalBackdrop}
            role="dialog"
            aria-modal="true"
            aria-labelledby="day-report-title"
            onClick={() => setShowDayReportModal(false)}
          >
            <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2 id="day-report-title" className={styles.modalTitle}>
                  Day report – {formatDayLabelWithYear(selectedDay)}
                </h2>
                <button
                  type="button"
                  className={styles.modalClose}
                  onClick={() => setShowDayReportModal(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className={styles.modalBody}>
                {(() => {
                  const bySport = {}
                  const byLocation = {}
                  selectedDayGames.forEach((g) => {
                    const sport = g.sport || 'Other'
                    bySport[sport] = (bySport[sport] || 0) + 1
                    const key = gameKey(g.sport, g.gameId)
                    const loc = getAssignment(key).location || 'Pending'
                    byLocation[loc] = (byLocation[loc] || 0) + 1
                  })
                  const sports = Object.entries(bySport).sort(([a], [b]) => a.localeCompare(b))
                  const locations = ['Pending', ...ASSIGNMENT_LOCATIONS]
                  return (
                    <>
                      <div className={styles.modalRow}>
                        <span className={styles.modalLabel}>Total games</span>
                        <span className={styles.modalValue}>{selectedDayGames.length}</span>
                      </div>
                      <h3 className={styles.modalSection}>By sport</h3>
                      {sports.map(([sport, count]) => (
                        <div key={sport} className={styles.modalRow}>
                          <span className={styles.modalLabel}>{sport}</span>
                          <span className={styles.modalValue}>{count}</span>
                        </div>
                      ))}
                      <h3 className={styles.modalSection}>Assigned to</h3>
                      {locations.map((loc) => (
                        <div key={loc} className={styles.modalRow}>
                          <span className={styles.modalLabel}>{loc}</span>
                          <span className={styles.modalValue}>{byLocation[loc] || 0}</span>
                        </div>
                      ))}
                    </>
                  )
                })()}
              </div>
            </div>
          </div>
        )}

        {selectedGameForDetail && (
          <div
            className={styles.modalBackdrop}
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-detail-title"
            onClick={() => setSelectedGameForDetail(null)}
          >
            <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2 id="game-detail-title" className={styles.modalTitle}>
                  Game details
                </h2>
                <button
                  type="button"
                  className={styles.modalClose}
                  onClick={() => setSelectedGameForDetail(null)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className={styles.modalBody}>
                {(() => {
                  const g = selectedGameForDetail
                  const times = formatTimes(g.dateUtc)
                  const assignKey = gameKey(g.sport, g.gameId)
                  const a = getAssignment(assignKey)
                  return (
                    <>
                      <h3 className={styles.modalSection}>Master schedule</h3>
                      <div className={styles.modalRow}>
                        <span className={styles.modalLabel}>Event</span>
                        <span className={styles.modalValue}>{eventName(g)}</span>
                      </div>
                      <div className={styles.modalRow}>
                        <span className={styles.modalLabel}>Sport</span>
                        <span className={styles.modalValue}>{g.sport || '—'}</span>
                      </div>
                      {g.gameId && (
                        <div className={styles.modalRow}>
                          <span className={styles.modalLabel}>Game ID</span>
                          <span className={styles.modalValue}>{g.gameId}</span>
                        </div>
                      )}
                      <div className={styles.modalRow}>
                        <span className={styles.modalLabel}>ET</span>
                        <span className={styles.modalValue}>{times.et}</span>
                      </div>
                      <div className={styles.modalRow}>
                        <span className={styles.modalLabel}>Dublin</span>
                        <span className={styles.modalValue}>{times.dub}</span>
                      </div>
                      <div className={styles.modalRow}>
                        <span className={styles.modalLabel}>Melbourne</span>
                        <span className={styles.modalValue}>{times.melb}</span>
                      </div>
                      <div className={styles.modalRow}>
                        <span className={styles.modalLabel}>Status</span>
                        <span className={styles.modalValue}>
                          {g.status || g.statusDetail || '—'}
                        </span>
                      </div>
                      {(g.homeTeam?.name || g.awayTeam?.name) && (
                        <div className={styles.modalRow}>
                          <span className={styles.modalLabel}>Teams</span>
                          <span className={styles.modalValue}>
                            {g.awayTeam?.name || '—'} @ {g.homeTeam?.name || '—'}
                          </span>
                        </div>
                      )}
                      {(g.venue?.name || g.venue?.fullName) && (
                        <div className={styles.modalRow}>
                          <span className={styles.modalLabel}>Venue</span>
                          <span className={styles.modalValue}>
                            {g.venue?.name || g.venue?.fullName || '—'}
                          </span>
                        </div>
                      )}
                      <h3 className={styles.modalSection}>Owner assignments</h3>
                      <div className={styles.modalRow}>
                        <span className={styles.modalLabel}>Location</span>
                        <span className={styles.modalValue}>{a.location || '—'}</span>
                      </div>
                      <div className={styles.modalRow}>
                        <span className={styles.modalLabel}>Traders</span>
                        <span className={styles.modalValue}>
                          {(a.traders || []).length
                            ? (a.traders || []).map((t) => (t.roleNote ? `${t.traderId} (${t.roleNote})` : t.traderId)).join(', ')
                            : '—'}
                        </span>
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>
          </div>
        )}
      </main>
    )
  }

  // Week detail: two fields at top, list of day cards (click → day detail)
  return (
    <main className={styles.page}>
      <div className={styles.weekDetailTopRow}>
        <div
          className={styles.weekDetailWeekField}
          aria-label="Week and date range"
        >
          Week {displayWeek}{weekDateRange ? ` · ${weekDateRange}` : ''}
        </div>
        <div className={styles.weekDetailSportWrap}>
          <select
            id="sport-filter"
            value={sportFilter}
            onChange={(e) => setSportFilter(e.target.value)}
            className={styles.filterSelect}
            aria-label="Filter by sport"
          >
            {SPORTS.map((s) => (
              <option key={s || 'all'} value={s}>
                {s || 'All sports'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.scrollWrap}>
        {gamesByDay.length > 0 ? (
          <div className={styles.dayCardList}>
            {gamesByDay.map(([dateStr, dayGames]) => {
              const assigned = dayGames.filter(
                (g) => getAssignment(gameKey(g.sport, g.gameId)).location
              ).length
              const total = dayGames.length
              return (
                <button
                  key={dateStr}
                  type="button"
                  className={styles.dayCard}
                  onClick={() => setSelectedDay(dateStr)}
                  aria-label={`${formatDayLabel(dateStr)}, ${assigned} of ${total} games assigned`}
                >
                  <span className={styles.accordionDayLabel}>
                    {formatDayLabel(dateStr)}
                  </span>
                  <span className={styles.accordionCount}>
                    {assigned}/{total} Games
                  </span>
                  <span className={styles.accordionChevron} aria-hidden>▶</span>
                </button>
              )
            })}
          </div>
        ) : (
          <p className={styles.empty}>
            No games in this week. Add games via BIR Schedule → Schedule Scraping, or choose a different sport.
          </p>
        )}
      </div>
    </main>
  )
}
