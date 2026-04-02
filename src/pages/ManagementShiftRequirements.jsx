import { useMemo, useState } from 'react'
import { ASSIGNMENT_LOCATIONS } from '../data/birAssignments'
import { getRequirementWeekStatus } from '../data/ownerDailyRequirements'
import styles from './ManagementShiftRequirements.module.css'

function getISOWeek(d) {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 4 - (date.getDay() || 7))
  const yearStart = new Date(date.getFullYear(), 0, 1)
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7)
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

export default function ManagementShiftRequirements() {
  const currentYear = new Date().getFullYear()
  const currentWeek = getISOWeek(new Date())
  const [year, setYear] = useState(currentYear)
  const [week, setWeek] = useState(currentWeek)
  const [destination, setDestination] = useState('')
  const [expandedDay, setExpandedDay] = useState(null)

  const weeklyRequirements = useMemo(() => {
    if (!destination) {
      return { days: [], totals: { sports: 0, demand: 0, submitted: 0 }, missing: [], allSubmitted: false }
    }
    const status = getRequirementWeekStatus(year, week, destination)
    const days = status.days.map((day) => {
      const totalDemand = day.sports.reduce((sum, row) => sum + row.requirement.tradersNeeded, 0)
      const submitted = day.sports.filter((row) => row.submitted).length
      return {
        dateStr: day.dateStr,
        label: formatDayLabel(day.dateStr),
        sports: day.sports,
        totalDemand,
        submitted,
      }
    })
    const totals = days.reduce((acc, day) => ({
      sports: acc.sports + day.sports.length,
      demand: acc.demand + day.totalDemand,
      submitted: acc.submitted + day.submitted,
    }), { sports: 0, demand: 0, submitted: 0 })
    return { ...status, days, totals }
  }, [destination, week, year])

  return (
    <main className={styles.page}>
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label htmlFor="dest-select" className={styles.label}>Destination</label>
          <select id="dest-select" className={styles.select} value={destination} onChange={(e) => setDestination(e.target.value)}>
            <option value="">Destination</option>
            {ASSIGNMENT_LOCATIONS.filter((location) => location !== 'Combo').map((location) => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="year-select" className={styles.label}>Year</label>
          <select id="year-select" className={styles.select} value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[currentYear - 1, currentYear, currentYear + 1].map((optionYear) => (
              <option key={optionYear} value={optionYear}>{optionYear}</option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="week-select" className={styles.label}>Week</label>
          <select id="week-select" className={styles.select} value={week} onChange={(e) => setWeek(Number(e.target.value))}>
            {Array.from({ length: 52 }, (_, index) => index + 1).map((optionWeek) => (
              <option key={optionWeek} value={optionWeek}>Week {optionWeek}</option>
            ))}
          </select>
        </div>
      </div>

      {!destination ? null : (
        <div className={styles.scrollWrap}>
          <section className={styles.section} aria-label="Week summary">
            <div className={styles.summaryRow}>
              <span className={styles.summaryItem}>Sports: {weeklyRequirements.totals.sports}</span>
              <span className={styles.summaryItem}>Demand: {weeklyRequirements.totals.demand}</span>
              <span className={styles.summaryItem}>Submitted: {weeklyRequirements.totals.submitted}/{weeklyRequirements.totals.sports}</span>
            </div>
          </section>

          <section className={styles.section} aria-label="Requirements by day">
            <div className={styles.dayList}>
              {weeklyRequirements.days.map((day) => {
                const isExpanded = expandedDay === day.dateStr
                return (
                  <div key={day.dateStr} className={styles.dayCard}>
                    <button
                      type="button"
                      className={styles.dayHeader}
                      onClick={() => setExpandedDay(isExpanded ? null : day.dateStr)}
                      aria-expanded={isExpanded}
                    >
                      <span className={styles.dayLabel}>{day.label}</span>
                      <span className={styles.dayMeta}>
                        {day.sports.length} sports · {day.totalDemand} demand
                      </span>
                      <span className={styles.chevron} aria-hidden>{isExpanded ? '▾' : '▸'}</span>
                    </button>
                    {isExpanded && (
                      <div className={styles.dayDetails}>
                        {day.sports.length === 0 ? null : (
                          <ul className={styles.gameList}>
                            {day.sports.map((row) => (
                              <li key={`${day.dateStr}-${row.sport}`} className={styles.gameRow}>
                                <div className={styles.gameMain}>
                                  <span className={styles.sportTag}>{row.sport}</span>
                                  <span className={styles.eventName}>{row.gamesCount} games</span>
                                  <span className={styles.gameTime}>{row.requirement.demandLevel}</span>
                                </div>
                                <div className={styles.gameAssignment}>
                                  <span className={styles.assignedLabel}>Need {row.requirement.tradersNeeded}</span>
                                  <span className={styles.traderChip}>Requested: {row.requirement.requestedTraderIds.length}</span>
                                  <span className={row.submitted ? styles.traderChip : styles.unassigned}>
                                    {row.submitted ? 'Submitted' : 'Missing'}
                                  </span>
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
