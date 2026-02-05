import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getMasterGames, addGameToMaster } from '../../data/birScheduleMaster'
import { formatDatePhone } from '../../utils/dateFormat'
import styles from './AllSportsScraper.module.css'

const SPORTS = ['', 'NBA', 'NFL', 'NHL', 'WNBA', 'MLB', 'NCAAM']

function toYYYYMMDD(dateStr) {
  if (!dateStr) return ''
  return dateStr.replace(/-/g, '')
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

function gamesToCsv(games) {
  const headers = [
    'Sport',
    'ET',
    'Dublin',
    'Melbourne',
    'Event',
    'Status',
    'Home',
    'Away',
    'Venue',
  ]
  const rows = games.map((g) => {
    const times = formatTimes(g.dateUtc)
    return [
      g.sport || '',
      times.et,
      times.dub,
      times.melb,
      eventName(g),
      g.status || '',
      g.homeTeam?.name || '',
      g.awayTeam?.name || '',
      g.venue?.name || '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')
  })
  return [headers.join(','), ...rows].join('\n')
}

export default function AllSportsScraperPage() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sportFilter, setSportFilter] = useState('')
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const [showJson, setShowJson] = useState(false)
  const [showAddEventModal, setShowAddEventModal] = useState(false)
  const [addEventSport, setAddEventSport] = useState('NBA')
  const [addEventName, setAddEventName] = useState('')
  const [error, setError] = useState(null)
  const [selectedGame, setSelectedGame] = useState(null)
  const [games, setGames] = useState(() => getMasterGames())

  const refreshGames = () => setGames(getMasterGames())

  const filteredGames = useMemo(() => {
    let list = [...games]
    const start = toYYYYMMDD(startDate)
    const end = toYYYYMMDD(endDate)
    if (start && start.length === 8) {
      list = list.filter((g) => {
        const d = g.dateUtc ? g.dateUtc.slice(0, 10).replace(/-/g, '') : ''
        return d >= start
      })
    }
    if (end && end.length === 8) {
      list = list.filter((g) => {
        const d = g.dateUtc ? g.dateUtc.slice(0, 10).replace(/-/g, '') : ''
        return d <= end
      })
    }
    if (sportFilter) {
      const upper = sportFilter.toUpperCase()
      list = list.filter((g) => (g.sport || '').toUpperCase() === upper)
    }
    return list.sort((a, b) => (a.dateUtc || '').localeCompare(b.dateUtc || ''))
  }, [games, startDate, endDate, sportFilter])

  const handleExportCsv = () => {
    if (filteredGames.length === 0) {
      setError('No games to export.')
      return
    }
    setError(null)
    const csv = gamesToCsv(filteredGames)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `all-sports-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleAddEvent = () => {
    const sport = (addEventSport || 'NBA').trim().toUpperCase()
    const name = (addEventName || '').trim()
    if (!name) {
      setError('Enter event name (e.g. Away Team @ Home Team).')
      return
    }
    setError(null)
    const parts = name.split('@').map((s) => s.trim())
    const away = parts[0] || 'Away'
    const home = parts[1] || 'Home'
    const game = {
      sport,
      homeTeam: { name: home },
      awayTeam: { name: away },
      dateUtc: new Date().toISOString(),
      status: 'Manual',
    }
    addGameToMaster(game)
    refreshGames()
    setAddEventName('')
    setShowAddEventModal(false)
  }

  return (
    <main className={styles.page}>
      <Link to="/bir-schedule/espn-scraper" className={styles.back}>
        ← Schedule Scraping
      </Link>

      <div className={styles.pinned}>
        <div className={styles.card}>
          <h1 className={styles.title}>
            <span className={styles.icon} aria-hidden>🌐</span>
            Master Schedule
          </h1>
          <div className={styles.controls}>
            <div className={styles.filterGrid}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={styles.dateInput}
                aria-label="From date"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={styles.dateInput}
                aria-label="To date"
              />
              <div className={styles.sportFilterWrap}>
                <label htmlFor="sport-filter" className={styles.srOnly}>
                  Sport
                </label>
                <select
                  id="sport-filter"
                  value={sportFilter}
                  onChange={(e) => setSportFilter(e.target.value)}
                  className={styles.sportSelect}
                  aria-label="Filter by sport"
                >
                  {SPORTS.map((s) => (
                    <option key={s || 'all'} value={s}>
                      {s || 'All sports'}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => setShowMoreOptions((s) => !s)}
                className={styles.moreOptionsBtn}
                aria-expanded={showMoreOptions}
                aria-label="More options"
              >
                More Options
              </button>
            </div>
            {showMoreOptions && (
              <div className={styles.moreOptions}>
                <div className={styles.moreOptionsRow}>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    disabled={filteredGames.length === 0}
                    className={styles.secondaryBtn}
                  >
                    CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowJson((s) => !s)}
                    disabled={filteredGames.length === 0}
                    className={styles.secondaryBtn}
                  >
                    JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddEventModal(true)
                      setError(null)
                    }}
                    className={styles.secondaryBtn}
                  >
                    Add Event
                  </button>
                </div>
              </div>
            )}
            {error && <p className={styles.error}>{error}</p>}
          </div>
        </div>
      </div>

      <div className={styles.scrollWrap}>
        {showJson && filteredGames.length > 0 && (
          <pre className={styles.jsonPreview}>
            {JSON.stringify({ games: filteredGames }, null, 2)}
          </pre>
        )}
        <div className={styles.gameList}>
          {filteredGames.length ? (
            filteredGames.map((game) => {
              const times = formatTimes(game.dateUtc)
              const key = `${game.sport || ''}:${game.gameId || ''}`
              return (
                <button
                  key={key || Math.random()}
                  type="button"
                  className={styles.gameCard}
                  onClick={() => setSelectedGame(game)}
                  aria-label={`View details for ${eventName(game)}`}
                >
                  <div className={styles.gameCardLine1} title={eventName(game)}>
                    {eventName(game)}
                  </div>
                  <div className={styles.gameCardLine2}>
                    <span className={styles.gameCardSport}>{game.sport || '—'}</span>
                    <span> – ET: {times.et}</span>
                  </div>
                </button>
              )
            })
          ) : (
            <p className={styles.empty}>
              No games match the filters. Adjust dates/sport or add events via More Options → Add Event.
            </p>
          )}
        </div>
      </div>

      {selectedGame && (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="game-detail-title"
          onClick={() => setSelectedGame(null)}
        >
          <div
            className={styles.modalPanel}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 id="game-detail-title" className={styles.modalTitle}>
                Game details
              </h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setSelectedGame(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              {(() => {
                const times = formatTimes(selectedGame.dateUtc)
                return (
                  <>
                    <div className={styles.modalRow}>
                      <span className={styles.modalLabel}>Event</span>
                      <span className={styles.modalValue}>{eventName(selectedGame)}</span>
                    </div>
                    <div className={styles.modalRow}>
                      <span className={styles.modalLabel}>Sport</span>
                      <span className={styles.modalValue}>{selectedGame.sport || '—'}</span>
                    </div>
                    {selectedGame.gameId && (
                      <div className={styles.modalRow}>
                        <span className={styles.modalLabel}>Game ID</span>
                        <span className={styles.modalValue}>{selectedGame.gameId}</span>
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
                        {selectedGame.status || selectedGame.statusDetail || '—'}
                      </span>
                    </div>
                    {(selectedGame.homeTeam?.name || selectedGame.awayTeam?.name) && (
                      <div className={styles.modalRow}>
                        <span className={styles.modalLabel}>Teams</span>
                        <span className={styles.modalValue}>
                          {selectedGame.awayTeam?.name || '—'} @ {selectedGame.homeTeam?.name || '—'}
                        </span>
                      </div>
                    )}
                    {(selectedGame.venue?.name || selectedGame.venue?.fullName) && (
                      <div className={styles.modalRow}>
                        <span className={styles.modalLabel}>Venue</span>
                        <span className={styles.modalValue}>
                          {selectedGame.venue?.name || selectedGame.venue?.fullName || '—'}
                        </span>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {showAddEventModal && (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-event-title"
          onClick={() => setShowAddEventModal(false)}
        >
          <div
            className={styles.modalPanel}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 id="add-event-title" className={styles.modalTitle}>
                Add Event
              </h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setShowAddEventModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <label htmlFor="add-event-sport" className={styles.modalLabel}>
                Sport
              </label>
              <select
                id="add-event-sport"
                value={addEventSport}
                onChange={(e) => setAddEventSport(e.target.value)}
                className={styles.modalInput}
              >
                {SPORTS.filter(Boolean).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <label htmlFor="add-event-name" className={styles.modalLabel}>
                Event name (e.g. Away Team @ Home Team)
              </label>
              <input
                id="add-event-name"
                type="text"
                value={addEventName}
                onChange={(e) => setAddEventName(e.target.value)}
                placeholder="Away Team @ Home Team"
                className={styles.modalInput}
              />
              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={handleAddEvent}
                  className={styles.syncBtn}
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddEventModal(false)}
                  className={styles.secondaryBtn}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
