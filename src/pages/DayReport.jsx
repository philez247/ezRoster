import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getMasterGames } from '../data/birScheduleMaster'
import { getAvailabilityReport } from '../data/availabilityReport'
import { formatDatePhone } from '../utils/dateFormat'
import styles from './DayReport.module.css'

function todayDateStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Get ET date (YYYY-MM-DD) for a game's dateUtc. */
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

export default function DayReport() {
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

  const availableTraders = useMemo(() => {
    return availabilityReport.filter(
      (r) => r.status === 'available' || r.status === 'preferred_in'
    )
  }, [availabilityReport])

  const unavailableTraders = useMemo(() => {
    return availabilityReport.filter((r) => r.status === 'unavailable')
  }, [availabilityReport])

  const noPreferenceTraders = useMemo(() => {
    return availabilityReport.filter((r) => r.status === 'no_preference')
  }, [availabilityReport])

  const preferredOffTraders = useMemo(() => {
    return availabilityReport.filter((r) => r.status === 'preferred_off')
  }, [availabilityReport])

  return (
    <main className={styles.page}>
      <Link to="/management" className={styles.back}>
        ← Management
      </Link>

      <h1 className={styles.title}>Games & Availability by Day</h1>
      <p className={styles.desc}>
        Select a date to see games on that day (ET) and which traders are available.
      </p>

      <div className={styles.filters}>
        <label htmlFor="day-report-date" className={styles.label}>
          Date
        </label>
        <input
          id="day-report-date"
          type="date"
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
          className={styles.dateInput}
          aria-label="Select date"
        />
      </div>

      <div className={styles.scrollWrap}>
        <section className={styles.section} aria-label="Games on this day">
          <h2 className={styles.sectionTitle}>Games ({gamesOnDay.length})</h2>
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
              No games on this date. Import from Schedule Scraping sport pages.
            </p>
          )}
        </section>

        <section className={styles.section} aria-label="Trader availability">
          <h2 className={styles.sectionTitle}>Traders Available</h2>
          <div className={styles.availabilityGrid}>
            <div className={styles.availabilityBlock} data-status="available">
              <h3 className={styles.blockTitle}>
                In ({availableTraders.length})
              </h3>
              <ul className={styles.traderList}>
                {availableTraders.map((r) => (
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
            </div>

            <div className={styles.availabilityBlock} data-status="unavailable">
              <h3 className={styles.blockTitle}>
                Off ({unavailableTraders.length})
              </h3>
              <ul className={styles.traderList}>
                {unavailableTraders.map((r) => (
                  <li key={r.traderId}>
                    <Link to={`/traders/${r.traderId}`} className={styles.name}>
                      {r.name}
                    </Link>
                    {r.alias && <span className={styles.alias}>@{r.alias}</span>}
                    {r.location && (
                      <span className={styles.location}>{r.location}</span>
                    )}
                    {r.source === 'REQUEST' && (
                      <span className={styles.badge}>Request</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.availabilityBlock} data-status="no_preference">
              <h3 className={styles.blockTitle}>
                No Preference ({noPreferenceTraders.length})
              </h3>
              <ul className={styles.traderList}>
                {noPreferenceTraders.map((r) => (
                  <li key={r.traderId}>
                    <Link to={`/traders/${r.traderId}`} className={styles.name}>
                      {r.name}
                    </Link>
                    {r.alias && <span className={styles.alias}>@{r.alias}</span>}
                    {r.location && (
                      <span className={styles.location}>{r.location}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.availabilityBlock} data-status="preferred_off">
              <h3 className={styles.blockTitle}>
                Preferred Off ({preferredOffTraders.length})
              </h3>
              <ul className={styles.traderList}>
                {preferredOffTraders.map((r) => (
                  <li key={r.traderId}>
                    <Link to={`/traders/${r.traderId}`} className={styles.name}>
                      {r.name}
                    </Link>
                    {r.alias && <span className={styles.alias}>@{r.alias}</span>}
                    {r.location && (
                      <span className={styles.location}>{r.location}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
