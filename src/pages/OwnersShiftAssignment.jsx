import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMasterGames } from '../data/birScheduleMaster'
import { ASSIGNMENT_LOCATIONS, gameKey, getAssignment, setAssignment } from '../data/birAssignments'
import { getAvailabilityReport } from '../data/availabilityReport'
import { getTraders } from '../data/traders'
import { getAllSkills } from '../data/traderSkills'
import { getRolesForSport } from '../config/store'
import { getMasterRosterRecord, refreshMasterRosterStatus } from '../data/masterRoster'
import layoutStyles from './Home.module.css'
import styles from './OwnersShiftAssignment.module.css'

const OFFICE_LOCATIONS = ASSIGNMENT_LOCATIONS.filter((loc) => loc !== 'Combo')
const SPORT_OPTIONS = ['', 'NBA', 'NFL', 'NHL', 'MLB', 'WNBA', 'NCAAM', 'CFB', 'Other']
const ELIGIBLE_STATUSES = ['preferred_in', 'available', 'no_preference']

function getISOWeek(d) {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 4 - (date.getDay() || 7))
  const yearStart = new Date(date.getFullYear(), 0, 1)
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7)
}

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

function getSevenDaysForWeek(year, weekNum) {
  const { start } = weekRange(year, weekNum)
  if (!start || start.length < 8) return []
  const y = Number(start.slice(0, 4))
  const m = Number(start.slice(5, 7)) - 1
  const d = Number(start.slice(8, 10))
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

function gameDateEt(dateUtc) {
  if (!dateUtc) return ''
  try {
    return new Date(dateUtc).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
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
    return new Date(dateUtc).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/New_York',
    })
  } catch {
    return ''
  }
}

function normalizeSportLabel(sport) {
  const upper = (sport || '').trim().toUpperCase()
  if (upper === 'CBB') return 'NCAAM'
  if (!upper) return 'Other'
  if (SPORT_OPTIONS.includes(upper)) return upper
  return 'Other'
}

function normalizeSkillSport(sport) {
  const upper = (sport || '').trim().toUpperCase()
  if (upper === 'CBB') return 'NCAAM'
  if (!upper) return ''
  if (SPORT_OPTIONS.includes(upper)) return upper
  return 'Other'
}

function eventName(game) {
  const away = game?.awayTeam?.name || 'Away'
  const home = game?.homeTeam?.name || 'Home'
  return `${away} @ ${home}`
}

function traderName(t) {
  return `${t?.firstName || ''} ${t?.lastName || ''}`.trim() || t?.alias || t?.traderId || ''
}

function formatAvailabilityStatus(status) {
  if (status === 'preferred_in') return 'Preferred IN'
  if (status === 'available') return 'IN'
  if (status === 'no_preference') return 'No Preference'
  return status || 'Unknown'
}

export default function OwnersShiftAssignment() {
  const currentYear = new Date().getFullYear()
  const currentWeek = getISOWeek(new Date())

  const [year, setYear] = useState(currentYear)
  const [week, setWeek] = useState(currentWeek)
  const [office, setOffice] = useState('')
  const [sport, setSport] = useState('')
  const [selectedDay, setSelectedDay] = useState('')
  const [assignmentVersion, setAssignmentVersion] = useState(0)
  const [assignChoiceByGame, setAssignChoiceByGame] = useState({})
  const [shiftChoiceByGame, setShiftChoiceByGame] = useState({})

  const traders = useMemo(() => getTraders().filter((t) => t.active !== false), [])
  const skillByTraderSport = useMemo(() => {
    const map = new Map()
    for (const s of getAllSkills()) {
      const traderId = s?.traderId || ''
      const skillSport = normalizeSkillSport(s?.sport)
      if (!traderId || !skillSport) continue
      const level = s?.level === 3 ? 3 : s?.level === 2 ? 2 : 1
      const k = `${traderId}|${skillSport}`
      const prev = map.get(k) || 0
      if (level > prev) map.set(k, level)
    }
    return map
  }, [])

  const hasSportSkill = (traderId, targetSport) => {
    const sportLabel = normalizeSkillSport(targetSport)
    if (!traderId || !sportLabel) return false
    return (skillByTraderSport.get(`${traderId}|${sportLabel}`) || 0) > 0
  }

  const weekDays = useMemo(() => getSevenDaysForWeek(year, week), [year, week])

  const gamesByDay = useMemo(() => {
    if (!office) return new Map()
    const weekSet = new Set(weekDays)
    const grouped = new Map(weekDays.map((d) => [d, []]))
    const games = getMasterGames()

    for (const g of games) {
      const key = gameKey(g.sport, g.gameId)
      const assignment = getAssignment(key)
      if (assignment.location !== office) continue
      const day = gameDateEt(g.dateUtc).slice(0, 10)
      if (!weekSet.has(day)) continue
      const sportLabel = normalizeSportLabel(g.sport)
      if (sport && sportLabel !== sport) continue
      grouped.get(day).push({ game: g, key, assignment, sport: sportLabel })
    }

    grouped.forEach((list) => list.sort((a, b) => (a.game.dateUtc || '').localeCompare(b.game.dateUtc || '')))
    return grouped
  }, [office, sport, weekDays, assignmentVersion])

  const approvedRoster = useMemo(() => {
    if (!office) return null
    return getMasterRosterRecord(office, year, week)
  }, [office, year, week, assignmentVersion])

  const workingByDay = useMemo(() => {
    const map = new Map()
    ;(approvedRoster?.days || []).forEach((day) => {
      const availability = getAvailabilityReport(day.dateStr)
      const availabilityByTrader = new Map(availability.map((row) => [row.traderId, row]))
      const rows = (day.working || [])
        .map((worker) => {
          const availabilityRow = availabilityByTrader.get(worker.traderId)
          return {
            traderId: worker.traderId,
            name: worker.name || availabilityRow?.name || worker.traderId,
            sports: Array.isArray(worker.sports) ? worker.sports : [],
            status: availabilityRow?.status || 'allocated',
          }
        })
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      map.set(day.dateStr, rows)
    })
    return map
  }, [approvedRoster])

  const daysSummary = useMemo(() => {
    return weekDays.map((day) => {
      const games = gamesByDay.get(day) || []
      const working = workingByDay.get(day) || []
      const daySports = new Set(games.map((g) => g.sport))
      const workersForSport = working.filter((worker) => {
        if (sport) return worker.sports.includes(sport) || hasSportSkill(worker.traderId, sport)
        return Array.from(daySports.values()).some((sp) => worker.sports.includes(sp) || hasSportSkill(worker.traderId, sp))
      })
      const assignedCount = games.reduce((sum, row) => sum + ((row.assignment.traders || []).length), 0)
      return {
        day,
        label: formatDayLabel(day),
        games,
        available: workersForSport,
        assignedCount,
      }
    })
  }, [gamesByDay, weekDays, sport, skillByTraderSport, workingByDay])

  const selectedDayData = daysSummary.find((d) => d.day === selectedDay)

  const handleAddShift = (gameRow) => {
    const choice = assignChoiceByGame[gameRow.key] || ''
    if (!choice) return
    const roleOptions = getRolesForSport(gameRow.sport)
    const shift = shiftChoiceByGame[gameRow.key] || roleOptions[0] || 'Other'
    const existing = gameRow.assignment.traders || []
    if (existing.some((t) => t.traderId === choice)) return
    setAssignment(gameRow.key, {
      location: gameRow.assignment.location,
      traders: [...existing, { traderId: choice, roleNote: shift, assignedSport: gameRow.sport }],
    })
    refreshMasterRosterStatus(office, year, week)
    setAssignChoiceByGame((prev) => ({ ...prev, [gameRow.key]: '' }))
    setShiftChoiceByGame((prev) => ({ ...prev, [gameRow.key]: getRolesForSport(gameRow.sport)[0] || 'IN Shift' }))
    setAssignmentVersion((v) => v + 1)
  }

  const handleRemoveShift = (gameRow, traderId) => {
    const next = (gameRow.assignment.traders || []).filter((t) => t.traderId !== traderId)
    setAssignment(gameRow.key, {
      location: gameRow.assignment.location,
      traders: next,
    })
    refreshMasterRosterStatus(office, year, week)
    setAssignmentVersion((v) => v + 1)
  }

  const handleUpdateShift = (gameRow, traderId, roleNote) => {
    const next = (gameRow.assignment.traders || []).map((t) => {
      if (t.traderId !== traderId) return t
      return { ...t, roleNote }
    })
    setAssignment(gameRow.key, {
      location: gameRow.assignment.location,
      traders: next,
    })
    refreshMasterRosterStatus(office, year, week)
    setAssignmentVersion((v) => v + 1)
  }

  return (
    <main className={`${layoutStyles.page} ${styles.page}`}>
      <div className={styles.filters}>
        <select className={styles.select} value={office} onChange={(e) => { setOffice(e.target.value); setSelectedDay('') }}>
          <option value="">Select office...</option>
          {OFFICE_LOCATIONS.map((loc) => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>
        <select className={styles.select} value={year} onChange={(e) => { setYear(Number(e.target.value)); setSelectedDay('') }}>
          {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select className={styles.select} value={week} onChange={(e) => { setWeek(Number(e.target.value)); setSelectedDay('') }}>
          {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
            <option key={w} value={w}>Week {w}</option>
          ))}
        </select>
        <select className={styles.select} value={sport} onChange={(e) => { setSport(e.target.value); setSelectedDay('') }}>
          <option value="">All sports</option>
          {SPORT_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {!office ? (
        <p className={styles.prompt}>Select office, week, and sport to assign shifts.</p>
      ) : !approvedRoster ? (
        <p className={styles.prompt}>No approved weekly rota found for this office and week. Run and approve the Allocation Engine first.</p>
      ) : !selectedDay ? (
        <section className={styles.dayList} aria-label="Days">
          {daysSummary.map((d) => (
            <button
              key={d.day}
              type="button"
              className={styles.dayCard}
              onClick={() => setSelectedDay(d.day)}
            >
              <span className={styles.dayTitle}>{d.label}</span>
              <span className={styles.dayMeta}>{d.games.length} games</span>
              <span className={styles.dayMeta}>{d.available.length} working</span>
              <span className={styles.dayMeta}>{d.assignedCount} assigned</span>
            </button>
          ))}
        </section>
      ) : (
        <section className={styles.detailWrap} aria-label="Day shift assignment">
            <div className={styles.topRow}>
              <button type="button" className={styles.backBtn} onClick={() => setSelectedDay('')}>
                Back
            </button>
              <div className={styles.daySummary}>
                <span>{selectedDayData?.label}</span>
                <span>{selectedDayData?.games.length || 0} games</span>
                <span>{selectedDayData?.available.length || 0} working</span>
              </div>
            </div>

          <div className={styles.columns}>
            <article className={styles.panel}>
              <h2 className={styles.panelTitle}>Games</h2>
              <div className={styles.panelBody}>
                {!selectedDayData?.games?.length ? (
                  <p className={styles.empty}>No games for this day.</p>
                ) : selectedDayData.games.map((row) => {
                  const assignedIds = new Set((row.assignment.traders || []).map((t) => t.traderId))
                  const availableOptions = (selectedDayData.available || []).filter((a) => !assignedIds.has(a.traderId))
                  return (
                    <div key={row.key} className={styles.gameCard}>
                      <div className={styles.gameHeader}>
                        <span className={styles.sportTag}>{row.sport}</span>
                        <span className={styles.gameEvent}>{eventName(row.game)}</span>
                        <span className={styles.gameTime}>{formatTimeEt(row.game.dateUtc)} ET</span>
                      </div>

                      <div className={styles.assignedRow}>
                        <span className={styles.assignedLabel}>Assigned:</span>
                        {(row.assignment.traders || []).length === 0 ? (
                          <span className={styles.empty}>None</span>
                        ) : (
                          (row.assignment.traders || []).map((t) => {
                            const tr = traders.find((x) => x.traderId === t.traderId)
                            const name = traderName(tr || t)
                            const roleOptions = getRolesForSport(row.sport)
                            return (
                              <span key={`${row.key}-${t.traderId}`} className={styles.traderChip}>
                                {name}
                                <select
                                  className={styles.shiftType}
                                  value={t.roleNote || roleOptions[0] || 'Other'}
                                  onChange={(e) => handleUpdateShift(row, t.traderId, e.target.value)}
                                >
                                  {roleOptions.map((type) => (
                                    <option key={type} value={type}>{type}</option>
                                  ))}
                                </select>
                                <button type="button" className={styles.removeBtn} onClick={() => handleRemoveShift(row, t.traderId)}>
                                  Remove
                                </button>
                              </span>
                            )
                          })
                        )}
                      </div>

                      <div className={styles.addRow}>
                        {((selectedDayData.available || []).filter((a) => hasSportSkill(a.traderId, row.sport)).length === 0) && (
                          <span className={styles.empty}>No sport-qualified traders available</span>
                        )}
                        <select
                          className={styles.inlineSelect}
                          value={assignChoiceByGame[row.key] || ''}
                          onChange={(e) => setAssignChoiceByGame((prev) => ({ ...prev, [row.key]: e.target.value }))}
                        >
                          <option value="">Select trader...</option>
                          {availableOptions
                            .filter((a) => hasSportSkill(a.traderId, row.sport))
                            .map((a) => (
                            <option key={`${row.key}-${a.traderId}`} value={a.traderId}>
                              {a.name} ({formatAvailabilityStatus(a.status)})
                            </option>
                            ))}
                        </select>
                        <select
                          className={styles.inlineSelect}
                          value={shiftChoiceByGame[row.key] || getRolesForSport(row.sport)[0] || 'Other'}
                          onChange={(e) => setShiftChoiceByGame((prev) => ({ ...prev, [row.key]: e.target.value }))}
                        >
                          {getRolesForSport(row.sport).map((type) => (
                            <option key={`${row.key}-type-${type}`} value={type}>{type}</option>
                          ))}
                        </select>
                        <button type="button" className={styles.addBtn} onClick={() => handleAddShift(row)}>
                          Assign
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </article>

            <article className={styles.panel}>
              <h2 className={styles.panelTitle}>Approved Working Traders</h2>
              <div className={styles.panelBody}>
                {!selectedDayData?.available?.length ? (
                  <p className={styles.empty}>No approved workers for this day.</p>
                ) : (
                  <ul className={styles.availableList}>
                    {selectedDayData.available.map((a) => (
                      <li key={`avl-${selectedDay}-${a.traderId}`} className={styles.availableRow}>
                        <Link to={`/traders/${a.traderId}`} className={styles.traderLink}>{a.name}</Link>
                        <span className={styles.statusBadge}>{(a.sports || []).join(', ') || formatAvailabilityStatus(a.status)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          </div>
        </section>
      )}
    </main>
  )
}
