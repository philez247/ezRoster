import { useState, useMemo } from 'react'
import { getMasterGames } from '../data/birScheduleMaster'
import {
  gameKey,
  getAssignment,
  setAssignment,
  ASSIGNMENT_LOCATIONS,
} from '../data/birAssignments'
import { getTraders } from '../data/traders'
import { formatDatePhone } from '../utils/dateFormat'
import styles from './BIRScheduleMain.module.css'

const SPORTS = ['', 'NBA', 'NFL', 'NHL', 'WNBA', 'MLB', 'NCAAM']

function toYYYYMMDD(dateStr) {
  if (!dateStr) return ''
  return dateStr.replace(/-/g, '')
}

function eventName(game) {
  const away = game?.awayTeam?.name || 'Away'
  const home = game?.homeTeam?.name || 'Home'
  return `${away} @ ${home}`
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

function gamesToCsv(games, tradersList) {
  const byId = new Map((tradersList || []).map((t) => [t.traderId, t]))
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
    'Location',
    'Traders',
  ]
  const rows = games.map((g) => {
    const times = formatTimes(g.dateUtc)
    const key = gameKey(g.sport, g.gameId)
    const a = getAssignment(key)
    const locationStr = a.location || ''
    const tradersStr = a.traders.length
      ? a.traders
          .map((t) => {
            const trader = byId.get(t.traderId)
            const name = trader ? (trader.alias || `${trader.firstName} ${trader.lastName}`.trim()) : t.traderId
            return t.roleNote ? `${name} (${t.roleNote})` : name
          })
          .join('; ')
      : ''
    return [
      g.sport || '',
      times.et,
      times.dub,
      times.melb,
      eventName(g),
      g.status || '',
      g.homeTeam?.name || '',
      g.awayTeam?.name || '',
      g.venue?.name || g.venue?.fullName || '',
      locationStr,
      tradersStr,
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')
  })
  return [headers.join(','), ...rows].join('\n')
}

export default function BIRScheduleMain() {
  const [games, setGames] = useState(() => getMasterGames())
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sportFilter, setSportFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [showMoreOptionsModal, setShowMoreOptionsModal] = useState(false)
  const [selectedGame, setSelectedGame] = useState(null)
  const [showGameInfoModal, setShowGameInfoModal] = useState(false)
  const [assignLocation, setAssignLocation] = useState('')
  const [assignTraders, setAssignTraders] = useState([])

  const refreshGames = () => setGames(getMasterGames())
  const traders = useMemo(() => getTraders(), [])

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
    if (locationFilter) {
      list = list.filter((g) => {
        const key = gameKey(g.sport, g.gameId)
        return getAssignment(key).location === locationFilter
      })
    }
    return list.sort((a, b) => (a.dateUtc || '').localeCompare(b.dateUtc || ''))
  }, [games, startDate, endDate, sportFilter, locationFilter])

  const openAssignModal = (game) => {
    setSelectedGame(game)
    const key = gameKey(game.sport, game.gameId)
    const a = getAssignment(key)
    setAssignLocation(a.location || '')
    setAssignTraders(
      a.traders.length
        ? a.traders.map((t) => ({ traderId: t.traderId, roleNote: t.roleNote || '' }))
        : [{ traderId: '', roleNote: '' }]
    )
  }

  const closeAssignModal = () => {
    setSelectedGame(null)
    setShowGameInfoModal(false)
    setAssignLocation('')
    setAssignTraders([{ traderId: '', roleNote: '' }])
  }

  const addTraderRow = () => {
    setAssignTraders((prev) => [...prev, { traderId: '', roleNote: '' }])
  }

  const removeTraderRow = (index) => {
    setAssignTraders((prev) => prev.filter((_, i) => i !== index))
  }

  const updateTraderRow = (index, field, value) => {
    setAssignTraders((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    )
  }

  const saveAssignment = () => {
    if (!selectedGame) return
    const key = gameKey(selectedGame.sport, selectedGame.gameId)
    const tradersToSave = assignTraders.filter((t) => t.traderId)
    setAssignment(key, {
      location: assignLocation || null,
      traders: tradersToSave.map((t) => ({
        traderId: t.traderId,
        roleNote: (t.roleNote || '').trim(),
      })),
    })
    refreshGames()
    closeAssignModal()
  }

  const handleExportCsv = () => {
    if (filteredGames.length === 0) return
    const csv = gamesToCsv(filteredGames, traders)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bir-schedule-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setShowMoreOptionsModal(false)
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>BIR Schedule</h1>

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
        <div className={styles.filterBySportWrap}>
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
        <div className={styles.moreOptionsWrap}>
          <button
            type="button"
            onClick={() => setShowMoreOptionsModal(true)}
            className={styles.moreOptionsBtn}
            aria-label="More options"
          >
            More Options
          </button>
        </div>
      </div>

      <div className={styles.scrollWrap}>
        {filteredGames.length ? (
          <div className={styles.gameList}>
            {filteredGames.map((game) => {
              const key = gameKey(game.sport, game.gameId)
              const a = getAssignment(key)
              const locationAssigned = !!a.location
              const tradersAssigned = a.traders.length > 0
              return (
                <button
                  key={key || Math.random()}
                  type="button"
                  className={styles.gameCard}
                  onClick={() => openAssignModal(game)}
                  aria-label={`Assign location and traders for ${eventName(game)}`}
                >
                  <div className={styles.gameCardLine1} title={eventName(game)}>
                    {eventName(game)}
                  </div>
                  <div className={styles.gameCardLine2}>
                    <span className={styles.gameCardSport}>{game.sport || '—'}</span>
                    <span> · Date (ET): {dateEt(game)}</span>
                  </div>
                  <div className={styles.badges}>
                    <span
                      className={
                        locationAssigned ? styles.badgeAssigned : styles.badgePending
                      }
                    >
                      Location: {locationAssigned ? a.location : 'Pending'}
                    </span>
                    <span
                      className={
                        tradersAssigned ? styles.badgeAssigned : styles.badgePending
                      }
                    >
                      Traders: {tradersAssigned ? `${a.traders.length} assigned` : 'Pending'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <p className={styles.empty}>
            No games match the filters. Add games via Schedule Scraping → Master Schedule.
          </p>
        )}
      </div>

      {selectedGame && (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="assign-modal-title"
          onClick={closeAssignModal}
        >
          <div
            className={styles.modalPanel}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 id="assign-modal-title" className={styles.modalTitle}>
                Assign: {eventName(selectedGame)}
              </h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={closeAssignModal}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalRow}>
                <button
                  type="button"
                  className={styles.seeMoreInfoBtn}
                  onClick={() => setShowGameInfoModal(true)}
                  aria-label="See more game details"
                >
                  See more info
                </button>
              </div>
              <div className={styles.modalRow}>
                <label htmlFor="assign-location" className={styles.modalLabel}>
                  Location
                </label>
                <select
                  id="assign-location"
                  value={assignLocation}
                  onChange={(e) => setAssignLocation(e.target.value)}
                  className={styles.modalSelect}
                >
                  <option value="">Pending</option>
                  {ASSIGNMENT_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.modalRow}>
                <span className={styles.modalLabel}>Traders (with role / note)</span>
                <div className={styles.traderRows}>
                  {assignTraders.map((row, index) => (
                    <div key={index} className={styles.traderRow}>
                      <select
                        value={row.traderId}
                        onChange={(e) => updateTraderRow(index, 'traderId', e.target.value)}
                        className={styles.traderRowSelect}
                        aria-label="Trader"
                      >
                        <option value="">Select trader</option>
                        {traders.map((t) => (
                          <option key={t.traderId} value={t.traderId}>
                            {t.alias || t.firstName} ({t.location || '—'})
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={row.roleNote}
                        onChange={(e) => updateTraderRow(index, 'roleNote', e.target.value)}
                        placeholder="Role / note"
                        className={styles.traderRowInput}
                        aria-label="Role or note for this trader"
                      />
                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => removeTraderRow(index)}
                        aria-label="Remove trader"
                        title="Remove"
                      >
                        −
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className={styles.addTraderBtn}
                    onClick={addTraderRow}
                  >
                    + Add trader
                  </button>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.saveBtn} onClick={saveAssignment}>
                  Save
                </button>
                <button type="button" className={styles.cancelBtn} onClick={closeAssignModal}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showGameInfoModal && selectedGame && (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="game-info-title"
          onClick={() => setShowGameInfoModal(false)}
        >
          <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 id="game-info-title" className={styles.modalTitle}>
                Game details
              </h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setShowGameInfoModal(false)}
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

      {showMoreOptionsModal && (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="more-options-title"
          onClick={() => setShowMoreOptionsModal(false)}
        >
          <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 id="more-options-title" className={styles.modalTitle}>
                More options
              </h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setShowMoreOptionsModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalRow}>
                <label htmlFor="more-location-filter" className={styles.modalLabel}>
                  Filter by location
                </label>
                <select
                  id="more-location-filter"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className={styles.modalSelect}
                  aria-label="Filter by assigned location"
                >
                  <option value="">All locations</option>
                  {ASSIGNMENT_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
              <div className={styles.modalRow}>
                <button
                  type="button"
                  className={styles.reportBtn}
                  disabled
                  aria-label="Report (coming soon)"
                >
                  Report
                </button>
              </div>
              <div className={styles.modalRow}>
                <button
                  type="button"
                  className={styles.exportCsvBtn}
                  onClick={handleExportCsv}
                  disabled={filteredGames.length === 0}
                  aria-label="Export as CSV"
                >
                  Export as CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
