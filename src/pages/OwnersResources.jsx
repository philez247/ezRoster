import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getMasterGames } from '../data/birScheduleMaster'
import { ASSIGNMENT_LOCATIONS, getAllAssignments, setAssignment } from '../data/birAssignments'
import layoutStyles from './Home.module.css'
import styles from './OwnersResources.module.css'
import {
  SPORTS,
  eventName,
  formatDateEtCompact,
  formatDateMelbourneCompact,
  formatDayLabel,
  formatFullDateEt,
  gameDateEt,
  getISOWeek,
  getSevenDaysForWeek,
} from './ownerWorkflow'

function buildParams(searchParams, overrides = {}) {
  const next = new URLSearchParams(searchParams)
  Object.entries(overrides).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') next.delete(key)
    else next.set(key, String(value))
  })
  return next
}

export default function OwnersResources() {
  const currentYear = new Date().getFullYear()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = searchParams.get('page') || 'week'
  const selectedDay = searchParams.get('date') || ''
  const sportFilter = searchParams.get('sport') || ''
  const [year, setYear] = useState(() => Number(searchParams.get('year')) || currentYear)
  const [week, setWeek] = useState(() => searchParams.get('week') || '')
  const [expandedGameKey, setExpandedGameKey] = useState(null)
  const [revision, setRevision] = useState(0)

  const allGames = useMemo(() => getMasterGames(), [])
  const assignments = useMemo(() => getAllAssignments(), [revision])
  const gamesByDate = useMemo(() => {
    const grouped = new Map()
    allGames.forEach((game) => {
      const dateStr = gameDateEt(game.dateUtc)
      if (!grouped.has(dateStr)) grouped.set(dateStr, [])
      grouped.get(dateStr).push(game)
    })
    return grouped
  }, [allGames])

  const weekDays = useMemo(() => {
    if (!week) return []
    return getSevenDaysForWeek(year, Number(week))
  }, [week, year])

  const daySummaries = useMemo(() => {
    return weekDays.map((dateStr) => {
      const dayGames = gamesByDate.get(dateStr) || []
      const assignedGames = dayGames.filter((game) => assignments[`${(game.sport || '').toUpperCase()}:${game.gameId || ''}`]?.location).length
      return { dateStr, totalGames: dayGames.length, assignedGames }
    })
  }, [assignments, gamesByDate, weekDays])

  const dayGames = useMemo(() => {
    if (!selectedDay) return []
    return (gamesByDate.get(selectedDay) || [])
      .filter((game) => !sportFilter || (game.sport || '').toUpperCase() === sportFilter)
      .sort((a, b) => (a.dateUtc || '').localeCompare(b.dateUtc || ''))
  }, [gamesByDate, selectedDay, sportFilter])

  const updatePage = (overrides) => {
    setSearchParams(buildParams(searchParams, overrides))
  }

  const handleWeekView = () => {
    if (!week) return
    setSearchParams(buildParams(searchParams, {
      year,
      week,
      page: 'week',
      date: null,
      sport: null,
    }))
  }

  if (page === 'week') {
    return (
      <main className={`${layoutStyles.page} ${styles.resourcesPage}`}>
        <section className={styles.resourcesContent}>
          <div className={styles.filterBar}>
            <div className={styles.filterGrid}>
              <label className={styles.filterGroup}>
                <span className={styles.label}>Year</span>
                <select className={styles.filterSelect} value={year} onChange={(event) => setYear(Number(event.target.value))}>
                  {Array.from({ length: 4 }, (_, index) => currentYear - 1 + index).map((optionYear) => (
                    <option key={optionYear} value={optionYear}>{optionYear}</option>
                  ))}
                </select>
              </label>
              <label className={styles.filterGroup}>
                <span className={styles.label}>Week</span>
                <select className={styles.filterSelect} value={week} onChange={(event) => setWeek(event.target.value)}>
                  <option value="">Select week</option>
                  {Array.from({ length: 53 }, (_, index) => index + 1).map((optionWeek) => (
                    <option key={optionWeek} value={optionWeek}>Week {optionWeek}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className={styles.viewWeekBtns}>
              <button type="button" className={styles.viewWeekBtn} onClick={handleWeekView} disabled={!week}>
                View
              </button>
            </div>
          </div>

          {week && (
            <div className={styles.dayCardList}>
              {daySummaries.map((day) => (
                <button
                  key={day.dateStr}
                  type="button"
                  className={styles.dayCard}
                  onClick={() => updatePage({ date: day.dateStr, page: 'games', sport: null })}
                >
                  <div className={styles.dayCardMain}>
                    <div className={styles.dayCardTopRow}>
                      <span className={styles.dayLabel}>{formatDayLabel(day.dateStr)}</span>
                      <span className={styles.chevron} aria-hidden>{'>'}</span>
                    </div>
                    <div className={styles.dayCardBottomRow}>
                      <span className={styles.dayMetaLeft}>Games: {day.totalGames}</span>
                      <span className={styles.dayMetaRight}>Assigned: {day.assignedGames}/{day.totalGames}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    )
  }

  if (page === 'games') {
    return (
      <main className={`${layoutStyles.page} ${styles.dayDetailPage}`}>
        <div className={styles.dayDetailTopRow}>
          <div className={styles.dayDetailHeaderField}>
            <div className={styles.dayDetailHeaderRow1}>{formatFullDateEt(selectedDay)}</div>
          </div>
          <div className={styles.dayDetailTopRightBtns}>
            <select
              className={`${styles.filterSelect} ${styles.dayDetailFilterSelect}`}
              value={sportFilter}
              onChange={(event) => updatePage({ sport: event.target.value })}
            >
              <option value="">Sport</option>
              {SPORTS.filter(Boolean).map((sport) => (
                <option key={sport} value={sport}>{sport}</option>
              ))}
            </select>
            <button type="button" className={styles.backBtn} onClick={() => updatePage({ page: 'week', date: null, sport: null })}>Back</button>
          </div>
        </div>

        <section className={styles.dayDetailContent}>
          <div className={styles.gamesScrollWindow}>
            {dayGames.length === 0 && <p className={styles.empty}>No games match this view.</p>}
            {dayGames.length > 0 && (
              <ul className={styles.gameList}>
                {dayGames.map((game) => {
                  const key = `${(game.sport || '').toUpperCase()}:${game.gameId || ''}`
                  const assignment = assignments[key] || { location: null, traders: [] }
                  const expanded = expandedGameKey === key
                  return (
                    <li key={key} className={styles.gameCard}>
                      <button
                        type="button"
                        className={styles.gameCardOneLine}
                        onClick={() => setExpandedGameKey(expanded ? null : key)}
                      >
                        <span className={styles.gameCardSummary}>
                          <span className={styles.gameCardSportCode}>{(game.sport || '').toUpperCase()}:</span>
                          <span className={styles.gameCardEventName}>{eventName(game)}</span>
                        </span>
                        <span className={assignment.location ? styles.gameLocation : styles.gameStatusUnassigned}>
                          {assignment.location || 'Pending'}
                        </span>
                      </button>
                      {expanded && (
                        <div className={styles.gameCardDetails}>
                          <div className={styles.gameCardHeader}>
                            <div className={styles.gameHeaderMeta}>
                              <span className={styles.gameInfoRow}>
                                <span className={styles.gameLabel}>ET</span>
                                <span className={styles.gameInfoValue}>{formatDateEtCompact(game.dateUtc)}</span>
                              </span>
                              <span className={styles.gameInfoRow}>
                                <span className={styles.gameLabel}>Melb</span>
                                <span className={styles.gameInfoValue}>{formatDateMelbourneCompact(game.dateUtc)}</span>
                              </span>
                            </div>
                            <div className={styles.gameHeaderControl}>
                              <select
                                className={`${styles.filterSelect} ${styles.gameHeaderSelect}`}
                                value={assignment.location || ''}
                                onChange={(event) => {
                                  setAssignment(key, {
                                    ...assignment,
                                    location: event.target.value || null,
                                  })
                                  setRevision((value) => value + 1)
                                }}
                              >
                                <option value="">Location</option>
                                {ASSIGNMENT_LOCATIONS.map((location) => (
                                  <option key={location} value={location}>{location}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>
      </main>
    )
  }
  return null
}
