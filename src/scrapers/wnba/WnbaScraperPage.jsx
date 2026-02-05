import { useState } from 'react'
import {
  syncWnbaScoreboard,
  syncWnbaScoreboardRange,
  todayYYYYMMDD,
} from '../../services/espnWnba'
import { compareWithMasterDetailed, mergeGamesIntoMaster } from '../../data/birScheduleMaster'
import { formatDatePhone, formatDateDesktop } from '../../utils/dateFormat'
import styles from './WnbaScraper.module.css'

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
      g.sport || 'WNBA',
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

export default function WnbaScraperPage() {
  const today = toDateInput(todayYYYYMMDD())
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ date: null, gamesCount: 0, dayIndex: 1, totalDays: 1 })
  const [error, setError] = useState(null)
  const [runGames, setRunGames] = useState([])
  const [runFetchedAtIso, setRunFetchedAtIso] = useState(null)
  const [mergeReport, setMergeReport] = useState(null)
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [syncPreview, setSyncPreview] = useState(null)
  const [showJson, setShowJson] = useState(false)
  const [showMoreOptions, setShowMoreOptions] = useState(false)

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
    setRunGames([])
    setRunFetchedAtIso(null)
    setMergeReport(null)
    setLoading(true)
    const startD = new Date(start.slice(0, 4), Number(start.slice(4, 6)) - 1, Number(start.slice(6, 8)))
    const endD = new Date(end.slice(0, 4), Number(end.slice(4, 6)) - 1, Number(end.slice(6, 8)))
    const totalDays = start === end ? 1 : Math.round((endD - startD) / (1000 * 60 * 60 * 24)) + 1
    setProgress({ date: start, gamesCount: 0, dayIndex: 1, totalDays })
    try {
      const onProgress = (date, gamesCount, dayIdx, total) => {
        setProgress({ date, gamesCount, dayIndex: dayIdx ?? 1, totalDays: total ?? 1 })
      }
      const opts = { skipSave: true, skipMerge: true }
      let result
      if (start === end) {
        result = await syncWnbaScoreboard(start, onProgress, opts)
      } else {
        result = await syncWnbaScoreboardRange(start, end, onProgress, opts)
      }
      setRunGames(result.games || [])
      setRunFetchedAtIso(result.fetchedAtIso || null)
      refreshStored()
    } catch (err) {
      setError(err.message || 'Import failed')
    } finally {
      setLoading(false)
      setProgress({ date: null, gamesCount: 0, dayIndex: 1, totalDays: 1 })
    }
  }

  const handleSyncWithMaster = () => {
    const games = runGames
    if (!games.length) {
      setError('No games to sync. Run Import first.')
      return
    }
    setError(null)
    const detailed = compareWithMasterDetailed(games, 'WNBA')
    if (detailed.updated > 0) {
      setSyncPreview({
        ...detailed,
        games,
        fetchedAtIso: runFetchedAtIso || new Date().toISOString(),
      })
      setShowSyncModal(true)
      return
    }
    mergeGamesIntoMaster(games, 'WNBA', runFetchedAtIso || new Date().toISOString())
    setMergeReport({ added: detailed.added, updated: detailed.updated, unchanged: detailed.unchanged })
    setRunGames([])
    setRunFetchedAtIso(null)
  }

  const confirmSyncWithMaster = () => {
    if (!syncPreview?.games?.length) {
      setShowSyncModal(false)
      setSyncPreview(null)
      return
    }
    mergeGamesIntoMaster(syncPreview.games, 'WNBA', syncPreview.fetchedAtIso)
    setMergeReport({
      added: syncPreview.added,
      updated: syncPreview.updated,
      unchanged: syncPreview.unchanged,
    })
    setRunGames([])
    setRunFetchedAtIso(null)
    setShowSyncModal(false)
    setSyncPreview(null)
  }

  const closeSyncModal = () => {
    setShowSyncModal(false)
    setSyncPreview(null)
  }

  const handleExportCsv = () => {
    const games = runGames
    if (games.length === 0) {
      setError('No games to export.')
      return
    }
    const csv = gamesToCsv(games)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `wnba-schedule-${todayYYYYMMDD()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const games = runGames

  return (
    <main className={styles.page}>
      <div className={styles.pinned}>
        <div className={styles.card}>
          <h1 className={styles.title}>
            <span className={styles.icon} aria-hidden>🏀</span>
            WNBA Schedule Scraper
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
                aria-label="Import WNBA schedule from ESPN"
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
                    onClick={handleSyncWithMaster}
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

      {showSyncModal && syncPreview && (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="sync-master-title"
          onClick={closeSyncModal}
        >
          <div
            className={styles.modalPanel}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 id="sync-master-title" className={styles.modalTitle}>
                Sync with master schedule
              </h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={closeSyncModal}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.compareSummary}>
                {syncPreview.updated} game(s) have changes (status, time, date, or venue). Update them in the master schedule?
              </p>
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
              <p className={styles.compareSummary}>
                Summary: {syncPreview.added} new, {syncPreview.updated} to update, {syncPreview.unchanged} unchanged.
              </p>
              <div className={styles.compareActions}>
                <button
                  type="button"
                  onClick={confirmSyncWithMaster}
                  className={styles.syncBtn}
                  aria-label="Update in master"
                >
                  Update in master
                </button>
                <button
                  type="button"
                  onClick={closeSyncModal}
                  className={styles.secondaryBtn}
                  aria-label="Cancel"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      <div className={styles.scrollWrap}>
        {showJson && games.length > 0 && (
          <pre className={styles.jsonPreview}>
            {JSON.stringify({ games }, null, 2)}
          </pre>
        )}
        <h2 className={styles.resultsHeading}>
          Results ({games.length} games)
        </h2>

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
                        <span className={styles.sportTag}>{game.sport || 'WNBA'}</span>
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

        <div className={styles.mobileResults}>
          {games.length ? (
            games.map((game) => {
              const times = formatTimes(game.dateUtc)
              return (
                <div key={game.gameId} className={styles.gameCard}>
                  <div className={styles.gameHeader}>
                    <span className={styles.sportTag}>{game.sport || 'WNBA'}</span>
                  </div>
                  <div className={styles.timesStack}>
                    <div className={styles.timeRow}>ET: {times.et}</div>
                    <div className={styles.timeRow}>Dublin: {times.dub}</div>
                    <div className={styles.timeRow}>Melbourne: {times.melb}</div>
                  </div>
                  <div className={styles.eventName}>{eventName(game)}</div>
                  <div className={styles.statusRow}>
                    <span className={styles.statusLabel}>Status</span>
                    <span className={styles.statusValue}>
                      {game.status || game.statusDetail || '—'}
                    </span>
                  </div>
                </div>
              )
            })
          ) : (
            <p className={styles.empty}>
              No games loaded. Select a date range and click Import.
            </p>
          )}
        </div>
        {games.length === 0 && (
          <p className={styles.emptyDesktop}>
            No games loaded. Select a date range and click Import.
          </p>
        )}
      </div>
    </main>
  )
}
