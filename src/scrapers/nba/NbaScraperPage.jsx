import { useState } from 'react'
import {
  fetchNbaScoreboard,
  fetchNbaScoreboardRange,
  todayYYYYMMDD,
} from '../../services/espnNba'
import { compareWithMaster, compareWithMasterDetailed, mergeGamesIntoMaster } from '../../data/birScheduleMaster'
import { formatDatePhone, formatDateDesktop } from '../../utils/dateFormat'
import styles from './NbaScraper.module.css'

function toDateInput(dateYYYYMMDD) {
  if (!dateYYYYMMDD || dateYYYYMMDD.length !== 8) return ''
  const y = dateYYYYMMDD.slice(0, 4)
  const m = dateYYYYMMDD.slice(4, 6)
  const d = dateYYYYMMDD.slice(6, 8)
  return `${y}-${m}-${d}`
}

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

function formatTimesDesktop(dateUtc) {
  if (!dateUtc) return { et: '—', dub: '—', melb: '—' }
  return {
    et: formatDateDesktop(dateUtc, 'America/New_York'),
    dub: formatDateDesktop(dateUtc, 'Europe/Dublin'),
    melb: formatDateDesktop(dateUtc, 'Australia/Melbourne'),
  }
}

/** Build event name: "Away Team @ Home Team" */
function eventName(game) {
  const away = game?.awayTeam?.name || 'Away'
  const home = game?.homeTeam?.name || 'Home'
  return `${away} @ ${home}`
}

function gamesToCsv(games, sport = 'NBA') {
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
      g.sport || sport,
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

export default function NbaScraperPage() {
  const today = toDateInput(todayYYYYMMDD())
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ date: null, gamesCount: 0, dayIndex: 1, totalDays: 1 })
  const [error, setError] = useState(null)
  const [showJson, setShowJson] = useState(false)
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const [selectedGame, setSelectedGame] = useState(null)
  /** After fetch: { games, fetchedAtIso, added, updated } — show compare modal, then Sync or Ignore */
  const [pendingMerge, setPendingMerge] = useState(null)
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [syncPreview, setSyncPreview] = useState(null)
  const [mergeReport, setMergeReport] = useState(null)

  function formatProgressDate(yyyymmdd) {
    if (!yyyymmdd || yyyymmdd.length !== 8) return '—'
    return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
  }

  const handleImportFromEspn = async () => {
    const start = toYYYYMMDD(startDate)
    const end = toYYYYMMDD(endDate)
    if (!start || start.length !== 8 || !end || end.length !== 8) {
      setError('Please select valid start and end dates.')
      return
    }
    if (start > end) {
      setError('Start date must be before or equal to end date.')
      return
    }
    setError(null)
    setPendingMerge(null)
    setLoading(true)
    setProgress({ date: start, gamesCount: 0, dayIndex: 1, totalDays: 1 })
    try {
      const onProgress = (date, gamesCount, dayIdx, total) => {
        setProgress({ date, gamesCount, dayIndex: dayIdx ?? 1, totalDays: total ?? 1 })
      }
      const result = start === end
        ? await fetchNbaScoreboard(start, onProgress)
        : await fetchNbaScoreboardRange(start, end, onProgress)
      const { added, updated } = compareWithMaster(result.games, 'NBA')
      setPendingMerge({
        games: result.games,
        fetchedAtIso: result.fetchedAtIso,
        added,
        updated,
      })
    } catch (err) {
      setError(err.message || 'Import failed')
    } finally {
      setLoading(false)
      setProgress({ date: null, gamesCount: 0, dayIndex: 1, totalDays: 1 })
    }
  }

  const handleSyncWithMaster = () => {
    if (!pendingMerge) return
    mergeGamesIntoMaster(pendingMerge.games, 'NBA', pendingMerge.fetchedAtIso)
    setMergeReport({
      added: syncPreview?.added ?? pendingMerge.added ?? 0,
      updated: syncPreview?.updated ?? pendingMerge.updated ?? 0,
      unchanged: syncPreview?.unchanged ?? 0,
    })
    setPendingMerge(null)
    setSyncPreview(null)
    setShowSyncModal(false)
  }

  /** Close the sync modal only; keep table populated until user leaves or re-runs Import */
  const handleCloseSyncModal = () => {
    setShowSyncModal(false)
  }

  /** Open the Compare With Master modal (triggered by More Options → SYNC) */
  const handleOpenSyncModal = () => {
    if (!pendingMerge?.games?.length) {
      setError('No games to sync. Run Import first.')
      return
    }
    setError(null)
    const detailed = compareWithMasterDetailed(pendingMerge.games, 'NBA')
    setSyncPreview(detailed)
    setShowSyncModal(true)
  }

  const handleExportCsv = () => {
    const games = pendingMerge?.games ?? []
    if (games.length === 0) {
      setError('No games to export.')
      return
    }
    const csv = gamesToCsv(games)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nba-schedule-${todayYYYYMMDD()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const games = pendingMerge?.games ?? []

  return (
    <main className={styles.page}>
      {/* Pinned top: title + From/To + buttons — does not scroll */}
      <div className={styles.pinned}>
        <div className={styles.card}>
          <h1 className={styles.title}>
            <span className={styles.icon} aria-hidden>🏀</span>
            NBA Schedule Scraper
          </h1>
          <div className={styles.controls}>
            <div className={styles.dateRow}>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={styles.dateInput}
                placeholder="From"
                aria-label="From date"
              />
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={styles.dateInput}
                placeholder="To"
                aria-label="To date"
              />
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                onClick={handleImportFromEspn}
                disabled={loading}
                className={styles.syncBtn}
                aria-label="Import NBA schedule from ESPN"
              >
                {loading ? 'Importing…' : 'Import'}
              </button>
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
                    onClick={handleOpenSyncModal}
                    disabled={games.length === 0}
                    className={styles.secondaryBtn}
                  >
                    SYNC
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    disabled={games.length === 0}
                    className={styles.secondaryBtn}
                  >
                    CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowJson((s) => !s)}
                    disabled={games.length === 0}
                    className={styles.secondaryBtn}
                  >
                    JSON
                  </button>
                </div>
              </div>
            )}
            {error && <p className={styles.error}>{error}</p>}
            {mergeReport && (
              <p className={styles.mergeReport} role="status">
                Sync complete: Added {mergeReport.added}, Updated {mergeReport.updated}, Unchanged {mergeReport.unchanged}.
              </p>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className={styles.progressOverlay} role="status" aria-live="polite">
          <div className={styles.progressWindow}>
            <p className={styles.progressTitle}>Importing…</p>
            <p className={styles.progressDay}>
              Day {progress.dayIndex}/{progress.totalDays}
            </p>
            <p className={styles.progressDate}>
              Date: {formatProgressDate(progress.date)}
            </p>
            <p className={styles.progressGames}>
              Games: {progress.gamesCount}
            </p>
          </div>
        </div>
      )}

      {/* Scrollable: game list/table — only this area scrolls */}
      <div className={styles.scrollWrap}>
        {showJson && games.length > 0 && (
          <pre className={styles.jsonPreview}>
            {JSON.stringify({ games }, null, 2)}
          </pre>
        )}

        {/* Desktop: full-width table with Sport, ET, DUB, MELB, Event Name */}
        <div className={styles.desktopResults}>
          {games.length > 0 && (
            <table className={styles.resultsTable}>
              <thead>
                <tr>
                  <th scope="col">Sport</th>
                  <th scope="col">ET</th>
                  <th scope="col">DUB</th>
                  <th scope="col">MELB</th>
                  <th scope="col">Event Name</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game) => {
                  const times = formatTimesDesktop(game.dateUtc)
                  return (
                    <tr key={game.gameId}>
                      <td>
                        <span className={styles.sportTag}>{game.sport || 'NBA'}</span>
                      </td>
                      <td>{times.et}</td>
                      <td>{times.dub}</td>
                      <td>{times.melb}</td>
                      <td>{eventName(game)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Mobile: compact 2-line cards with click-for-details */}
        <div className={styles.mobileResults}>
          {games.length ? (
            games.map((game) => {
              const times = formatTimes(game.dateUtc)
              return (
                <button
                  key={game.gameId}
                  type="button"
                  className={styles.gameCard}
                  onClick={() => setSelectedGame(game)}
                  aria-label={`View details for ${eventName(game)}`}
                >
                  <div className={styles.gameCardLine1}>{eventName(game)}</div>
                  <div className={styles.gameCardLine2}>
                    {game.sport || 'NBA'} – ET: {times.et}
                  </div>
                </button>
              )
            })
          ) : (
            <p className={styles.empty}>
              No games loaded. Select a date range and click Import NBA.
            </p>
          )}
        </div>
        {games.length === 0 && (
          <p className={styles.emptyDesktop}>
            No games loaded. Select a date range and click Import NBA.
          </p>
        )}
      </div>

      {/* After scrape: compare with master — Sync or Ignore */}
      {pendingMerge && showSyncModal && (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="compare-title"
          onClick={handleCloseSyncModal}
        >
          <div
            className={styles.modalPanel}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 id="compare-title" className={styles.modalTitle}>
                Compare With Master Schedule
              </h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={handleCloseSyncModal}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.compareSummary}>
                {syncPreview?.updated
                  ? `${syncPreview.updated} game(s) have changes (status, time, date, or venue). Update them in the master schedule?`
                  : `This import would add ${syncPreview?.added ?? 0} new game(s) and update ${syncPreview?.updated ?? 0} existing game(s) in the master schedule.`}
              </p>
              {syncPreview?.changes?.length > 0 && (
                <ul className={styles.syncChangesList}>
                  {syncPreview.changes.map((c, i) => (
                    <li key={c.game.gameId || i}>
                      <strong>{eventName(c.game)}</strong>
                      <ul className={styles.syncDiffsList}>
                        {c.diffs.map((d, j) => (
                          <li key={j}>{d}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
              {syncPreview && (
                <p className={styles.compareSummary}>
                  Summary: {syncPreview.added} new, {syncPreview.updated} to update, {syncPreview.unchanged} unchanged.
                </p>
              )}
              <div className={styles.compareActions}>
                <button
                  type="button"
                  onClick={handleSyncWithMaster}
                  className={styles.syncBtn}
                  aria-label="Sync with master"
                >
                  Sync
                </button>
                <div className={styles.compareActionsRight}>
                  <button
                    type="button"
                    onClick={handleCloseSyncModal}
                    className={styles.secondaryBtn}
                    aria-label="Ignore and close"
                  >
                    Ignore
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseSyncModal}
                    className={styles.secondaryBtn}
                    aria-label="Cancel"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                        <span className={styles.modalValue}>
                          {eventName(selectedGame)}
                        </span>
                      </div>
                      <div className={styles.modalRow}>
                        <span className={styles.modalLabel}>Sport</span>
                        <span className={styles.modalValue}>
                          {selectedGame.sport || 'NBA'}
                        </span>
                      </div>
                      {selectedGame.gameId && (
                        <div className={styles.modalRow}>
                          <span className={styles.modalLabel}>ESPN Game ID</span>
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
                      {((selectedGame.awayTeam?.teamId ?? selectedGame.awayTeam?.id) || (selectedGame.homeTeam?.teamId ?? selectedGame.homeTeam?.id)) && (
                        <div className={styles.modalRow}>
                          <span className={styles.modalLabel}>ESPN Team IDs</span>
                          <span className={styles.modalValue}>
                            Away: {selectedGame.awayTeam?.teamId ?? selectedGame.awayTeam?.id ?? '—'} · Home: {selectedGame.homeTeam?.teamId ?? selectedGame.homeTeam?.id ?? '—'}
                          </span>
                        </div>
                      )}
                      {selectedGame.venue?.name && (
                        <div className={styles.modalRow}>
                          <span className={styles.modalLabel}>Venue</span>
                          <span className={styles.modalValue}>
                            {selectedGame.venue.name}
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
    </main>
  )
}
