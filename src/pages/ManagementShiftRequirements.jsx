import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getMasterGames } from '../data/birScheduleMaster'
import { gameKey, getAssignment, ASSIGNMENT_LOCATIONS } from '../data/birAssignments'
import { getTraders } from '../data/traders'
import styles from './ManagementShiftRequirements.module.css'

const SLOTS_PER_GAME = 1

/** Get ISO week number (1-52) for a date. */
function getISOWeek(d) {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 4 - (date.getDay() || 7))
  const yearStart = new Date(date.getFullYear(), 0, 1)
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7)
}

/** Get start (Monday) of ISO week N in year Y. */
function weekRange(year, weekNum) {
  const jan4 = new Date(year, 0, 4)
  const dayOfWeek = jan4.getDay() || 7
  const mondayJan4 = new Date(jan4)
  mondayJan4.setDate(jan4.getDate() - dayOfWeek + 1)
  const weekStart = new Date(mondayJan4)
  weekStart.setDate(mondayJan4.getDate() + (weekNum - 1) * 7)
  const toYmd = (d) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  return { start: toYmd(weekStart) }
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

function formatTimeEt(dateUtc) {
  if (!dateUtc) return ''
  try {
    const d = new Date(dateUtc)
    return d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/New_York',
    })
  } catch {
    return ''
  }
}

function eventName(game) {
  const away = game?.awayTeam?.name || 'Away'
  const home = game?.homeTeam?.name || 'Home'
  return `${away} @ ${home}`
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

export default function ManagementShiftRequirements() {
  const currentYear = new Date().getFullYear()
  const currentWeek = getISOWeek(new Date())
  const [year, setYear] = useState(currentYear)
  const [week, setWeek] = useState(currentWeek)
  const [destination, setDestination] = useState('')
  const [expandedDay, setExpandedDay] = useState(null)

  const traders = useMemo(() => getTraders().filter((t) => t.active !== false), [])

  const weeklyRequirements = useMemo(() => {
    if (!destination) return { days: [], totalGames: 0, totalNeeded: 0, totalAssigned: 0 }
    const games = getMasterGames()
    const sevenDays = getSevenDaysForWeek(year, week)
    const byDate = new Map()

    sevenDays.forEach((dateStr) => {
      byDate.set(dateStr, [])
    })

    games.forEach((g) => {
      const a = getAssignment(gameKey(g.sport, g.gameId))
      if (!a.location) return
      if (a.location !== destination) return
      const dateStr = gameDateEt(g.dateUtc).slice(0, 10)
      if (!byDate.has(dateStr)) return
      const needed = SLOTS_PER_GAME
      const assigned = (a.traders || []).length
      byDate.get(dateStr).push({
        game: g,
        key: gameKey(g.sport, g.gameId),
        needed,
        assigned,
        traderIds: (a.traders || []).map((t) => t.traderId),
      })
    })

    let totalGames = 0
    let totalNeeded = 0
    let totalAssigned = 0
    const days = sevenDays.map((dateStr) => {
      const rows = byDate.get(dateStr) || []
      const dayNeeded = rows.reduce((s, r) => s + r.needed, 0)
      const dayAssigned = rows.reduce((s, r) => s + r.assigned, 0)
      totalGames += rows.length
      totalNeeded += dayNeeded
      totalAssigned += dayAssigned
      return { dateStr, label: formatDayLabel(dateStr), rows, dayNeeded, dayAssigned }
    })

    return { days, totalGames, totalNeeded, totalAssigned }
  }, [year, week, destination])

  const getTraderName = (traderId) => {
    const t = traders.find((tr) => tr.traderId === traderId)
    if (!t) return traderId
    return `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.alias || traderId
  }

  return (
    <main className={styles.page}>
      <Link to="/management" className={styles.back}>
        ← Management
      </Link>

      <h1 className={styles.title}>Shift Requirements by Destination</h1>
      <p className={styles.desc}>
        View weekly requirements for a specific destination. Select destination, year, and week to see what coverage is needed each day.
      </p>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label htmlFor="dest-select" className={styles.label}>Destination</label>
          <select
            id="dest-select"
            className={styles.select}
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            aria-label="Select destination"
          >
            <option value="">Select destination…</option>
            {ASSIGNMENT_LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="year-select" className={styles.label}>Year</label>
          <select
            id="year-select"
            className={styles.select}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-label="Select year"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="week-select" className={styles.label}>Week</label>
          <select
            id="week-select"
            className={styles.select}
            value={week}
            onChange={(e) => setWeek(Number(e.target.value))}
            aria-label="Select week"
          >
            {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w}>Week {w}</option>
            ))}
          </select>
        </div>
      </div>

      {!destination ? (
        <p className={styles.prompt}>Select a destination to view requirements.</p>
      ) : (
        <div className={styles.scrollWrap}>
          <section className={styles.section} aria-label="Week summary">
            <h2 className={styles.sectionTitle}>Week {week} Summary</h2>
            <div className={styles.summaryRow}>
              <span className={styles.summaryItem}>Games: {weeklyRequirements.totalGames}</span>
              <span className={styles.summaryItem}>Slots needed: {weeklyRequirements.totalNeeded}</span>
              <span className={styles.summaryItem}>Assigned: {weeklyRequirements.totalAssigned}/{weeklyRequirements.totalNeeded}</span>
            </div>
          </section>

          <section className={styles.section} aria-label="Requirements by day">
            <h2 className={styles.sectionTitle}>By Day</h2>
          <div className={styles.dayList}>
            {weeklyRequirements.days.map((d) => {
              const isExpanded = expandedDay === d.dateStr
              return (
                <div key={d.dateStr} className={styles.dayCard}>
                  <button
                    type="button"
                    className={styles.dayHeader}
                    onClick={() => setExpandedDay(isExpanded ? null : d.dateStr)}
                    aria-expanded={isExpanded}
                  >
                    <span className={styles.dayLabel}>{d.label}</span>
                    <span className={styles.dayMeta}>
                      {d.rows.length} game{d.rows.length !== 1 ? 's' : ''} · {d.dayAssigned}/{d.dayNeeded} assigned
                    </span>
                    <span className={styles.chevron} aria-hidden>{isExpanded ? '▾' : '▶'}</span>
                  </button>
                  {isExpanded && (
                    <div className={styles.dayDetails}>
                      {d.rows.length === 0 ? (
                        <p className={styles.noGames}>No games at {destination} on this day.</p>
                      ) : (
                        <ul className={styles.gameList}>
                          {d.rows.map((r) => (
                            <li key={r.key} className={styles.gameRow}>
                              <div className={styles.gameMain}>
                                <span className={styles.sportTag}>{r.game.sport}</span>
                                <span className={styles.eventName}>{eventName(r.game)}</span>
                                <span className={styles.gameTime}>{formatTimeEt(r.game.dateUtc)}</span>
                              </div>
                              <div className={styles.gameAssignment}>
                                <span className={styles.assignedLabel}>
                                  Assigned ({r.assigned}/{r.needed}):
                                </span>
                                {r.traderIds.length > 0 ? (
                                  r.traderIds.map((tid) => (
                                    <span key={tid} className={styles.traderChip}>{getTraderName(tid)}</span>
                                  ))
                                ) : (
                                  <span className={styles.unassigned}>—</span>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          </section>
        </div>
      )}
    </main>
  )
}
