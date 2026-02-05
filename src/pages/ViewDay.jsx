import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getMasterGames } from '../data/birScheduleMaster'
import { getAvailabilityReport } from '../data/availabilityReport'
import { formatDatePhone } from '../utils/dateFormat'
import styles from './ViewDay.module.css'

function todayDateStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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

function formatTimes(dateUtc) {
  if (!dateUtc) return { et: '—', dub: '—', melb: '—' }
  return {
    et: formatDatePhone(dateUtc, 'America/New_York'),
    dub: formatDatePhone(dateUtc, 'Europe/Dublin'),
    melb: formatDatePhone(dateUtc, 'Australia/Melbourne'),
  }
}

function eventName(game) {
  const away = game?.awayTeam?.name || 'Away'
  const home = game?.homeTeam?.name || 'Home'
  return `${away} @ ${home}`
}

export default function ViewDay() {
  const [selectedDay, setSelectedDay] = useState(todayDateStr())

  const gamesOnDay = useMemo(() => {
    const games = getMasterGames()
    const day = (selectedDay || '').trim()
    if (!day || day.length < 10) return []
    return games.filter((g) => gameDateEt(g.dateUtc) === day)
  }, [selectedDay])

  const availabilityReport = useMemo(() => {
    if (!selectedDay || selectedDay.length < 10) return []
    return getAvailabilityReport(selectedDay)
  }, [selectedDay])

  const availableToWork = useMemo(() => {
    return availabilityReport.filter(
      (r) => r.status === 'available' || r.status === 'preferred_in'
    )
  }, [availabilityReport])

  const notAvailable = useMemo(() => {
    return availabilityReport.filter((r) => r.status === 'unavailable')
  }, [availabilityReport])

  return (
    <main className={styles.page}>
      <Link to="/management" className={styles.back}>
        ← Management
      </Link>

      <h1 className={styles.title}>View Day</h1>

      <div className={styles.filters}>
        <label htmlFor="view-day-date" className={styles.label}>
          Select day
        </label>
        <input
          id="view-day-date"
          type="date"
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
          className={styles.dateInput}
          aria-label="Select date"
        />
      </div>

      <div className={styles.scrollWrap}>
        <section className={styles.section} aria-label="Games on this day">
          <h2 className={styles.sectionTitle}>
            Games on this day ({gamesOnDay.length})
          </h2>
          {gamesOnDay.length > 0 ? (
            <ul className={styles.gameList}>
              {gamesOnDay.map((game) => {
                const times = formatTimes(game.dateUtc)
                const key = `${game.sport || ''}:${game.gameId || ''}`
                return (
                  <li key={key} className={styles.gameCard}>
                    <span className={styles.sportTag}>{game.sport || '—'}</span>
                    <div className={styles.timesStack}>
                      <span>ET: {times.et}</span>
                      <span>Dublin: {times.dub}</span>
                      <span>Melbourne: {times.melb}</span>
                    </div>
                    <div className={styles.eventName}>{eventName(game)}</div>
                    <span className={styles.gameStatus}>
                      {game.status || game.statusDetail || '—'}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className={styles.empty}>
              No games on this date. Add games via BIR Schedule → Schedule Scraping.
            </p>
          )}
        </section>

        <section className={styles.section} aria-label="Available to work">
          <h2 className={styles.sectionTitle}>
            Available to work ({availableToWork.length})
          </h2>
          {availableToWork.length > 0 ? (
            <ul className={styles.traderList}>
              {availableToWork.map((r) => (
                <li key={r.traderId}>
                  <Link to={`/traders/${r.traderId}`} className={styles.name}>
                    {r.name}
                  </Link>
                  {r.alias && <span className={styles.alias}>@{r.alias}</span>}
                  {r.location && (
                    <span className={styles.location}>{r.location}</span>
                  )}
                  {r.sport && (
                    <span className={styles.traderSport}>{r.sport}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>
              No traders marked available on this day.
            </p>
          )}

          {notAvailable.length > 0 && (
            <>
              <h3 className={styles.subTitle}>Not available ({notAvailable.length})</h3>
              <ul className={styles.traderList}>
                {notAvailable.map((r) => (
                  <li key={r.traderId} className={styles.unavailableRow}>
                    <Link to={`/traders/${r.traderId}`} className={styles.name}>
                      {r.name}
                    </Link>
                    {r.alias && <span className={styles.alias}>@{r.alias}</span>}
                    {r.location && (
                      <span className={styles.location}>{r.location}</span>
                    )}
                    {r.source === 'REQUEST' && (
                      <span className={styles.badge}>Day off</span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
