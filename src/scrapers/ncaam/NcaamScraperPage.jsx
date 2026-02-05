import { useState } from 'react'
import { syncNcaamD1Teams } from '../../services/espnNcaamD1'
import { syncNcaamScoreboard, todayYYYYMMDD } from '../../services/espnNcaamScoreboard'
import { compareWithMasterDetailed, mergeGamesIntoMaster } from '../../data/birScheduleMaster'
import { getNcaamTeamsD1 } from '../../data/ncaamTeams'
import { formatDatePhone, formatDateDesktop } from '../../utils/dateFormat'
import styles from './NcaamScraper.module.css'

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

function formatLastSync(iso) {
  if (!iso) return null
  return formatDatePhone(iso)
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
      g.sport || 'NCAAM',
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

export default function NcaamScraperPage() {
  const today = toDateInput(todayYYYYMMDD())
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [loading, setLoading] = useState(false)
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [error, setError] = useState(null)
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const [showJson, setShowJson] = useState(false)
  const [showD1TeamsModal, setShowD1TeamsModal] = useState(false)
  const [selectedGame, setSelectedGame] = useState(null)
  const [runGames, setRunGames] = useState([])
  const [runFetchedAtIso, setRunFetchedAtIso] = useState(null)
  const [mergeReport, setMergeReport] = useState(null)
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [syncPreview, setSyncPreview] = useState(null)
  const [storedTeams, setStoredTeams] = useState(() => getNcaamTeamsD1())

  const refreshStored = () => {
    setStoredTeams(getNcaamTeamsD1())
  }

  const handleImportFromEspn = async () => {
    const start = toYYYYMMDD(startDate)
    if (!start || start.length !== 8) {
      setError('Please select a valid date.')
      return
    }
    setError(null)
    setRunGames([])
    setRunFetchedAtIso(null)
    setLoading(true)
    try {
      const result = await syncNcaamScoreboard(start, { skipSave: true, skipMerge: true })
      setRunGames(result.games || [])
      setRunFetchedAtIso(result.fetchedAtIso || null)
      refreshStored()
    } catch (err) {
      setError(err.message || 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSyncTeams = async () => {
    setError(null)
    setLoadingTeams(true)
    try {
      await syncNcaamD1Teams()
      refreshStored()
    } catch (err) {
      setError(err.message || 'Sync failed')
    } finally {
      setLoadingTeams(false)
    }
  }

  const handleSyncWithMaster = () => {
    const games = runGames
    if (!games.length) {
      setError('No games to sync. Run Import first.')
      return
    }
    setError(null)
    const detailed = compareWithMasterDetailed(games, 'NCAAM')
    if (detailed.updated > 0) {
      setSyncPreview({
        ...detailed,
        games,
        fetchedAtIso: runFetchedAtIso || new Date().toISOString(),
      })
      setShowSyncModal(true)
      return
    }
    mergeGamesIntoMaster(games, 'NCAAM', runFetchedAtIso || new Date().toISOString())
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
    mergeGamesIntoMaster(syncPreview.games, 'NCAAM', syncPreview.fetchedAtIso)
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
    a.download = `ncaam-schedule-${todayYYYYMMDD()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const games = runGames
  const teams = storedTeams?.teams || []

  return (
    <main className={styles.page}>
      <div className={styles.pinned}>
        <div className={styles.card}>
          <h1 className={styles.title}>
            <span className={styles.icon} aria-hidden>🏀</span>
            CBB Schedule Scraper
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
                aria-label="Import NCAAM schedule from ESPN"
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
                <div className={styles.d1Row}>
                  <button
                    type="button"
                    onClick={() => setShowD1TeamsModal(true)}
                    className={styles.secondaryBtn}
                    aria-label="D1 Teams"
                  >
                    D1 Teams
                  </button>
                </div>
              </div>
            )}
            {runFetchedAtIso && games.length > 0 && (
              <p className={styles.lastSync}>
                Last run: {formatLastSync(runFetchedAtIso)} · {games.length} games
              </p>
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

      <div className={styles.scrollWrap}>
        {showJson && games.length > 0 && (
          <pre className={styles.jsonPreview}>
            {JSON.stringify({ games }, null, 2)}
          </pre>
        )}

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
                    <tr
                      key={game.gameId}
                      onClick={() => setSelectedGame(game)}
                      className={styles.clickableRow}
                    >
                      <td>
                        <span className={styles.sportTag}>{game.sport || 'NCAAM'}</span>
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
                <button
                  key={game.gameId}
                  type="button"
                  className={styles.gameCard}
                  onClick={() => setSelectedGame(game)}
                  aria-label={`View details for ${eventName(game)}`}
                >
                  <div className={styles.gameCardLine1}>{eventName(game)}</div>
                  <div className={styles.gameCardLine2}>
                    {game.sport || 'NCAAM'} – ET: {times.et}
                  </div>
                </button>
              )
            })
          ) : (
            <p className={styles.empty}>
              No games loaded. Select a date and click Import, or sync via More Options.
            </p>
          )}
        </div>
        {games.length === 0 && (
          <p className={styles.emptyDesktop}>
            No games loaded. Select a date and click Import, or sync via More Options.
          </p>
        )}
      </div>

      {showD1TeamsModal && (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="d1-teams-modal-title"
          onClick={() => setShowD1TeamsModal(false)}
        >
          <div
            className={styles.modalPanel}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 id="d1-teams-modal-title" className={styles.modalTitle}>
                D1 Teams
              </h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setShowD1TeamsModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.d1Row} style={{ marginBottom: '1rem' }}>
                <button
                  type="button"
                  onClick={async () => {
                    setError(null)
                    setLoadingTeams(true)
                    try {
                      await syncNcaamD1Teams()
                      refreshStored()
                    } catch (err) {
                      setError(err.message || 'Sync failed')
                    } finally {
                      setLoadingTeams(false)
                    }
                  }}
                  disabled={loadingTeams}
                  className={styles.syncBtn}
                  aria-label="Refresh teams"
                >
                  {loadingTeams ? 'Refreshing…' : 'Refresh teams'}
                </button>
              </div>
              <p className={styles.modalLabel}>
                View teams ({teams.length} D1)
              </p>
              <div className={styles.teamsListWrap}>
                {teams.length === 0 ? (
                  <p className={styles.lastSync}>No D1 teams yet. Click Refresh teams.</p>
                ) : (
                  <ul className={styles.teamsList}>
                    {teams.map((t) => (
                      <li key={t.id}>
                        {t.name || t.shortName || t.id}
                        {t.conference && ` · ${t.conference}`}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {storedTeams?.fetchedAtIso && (
                <p className={styles.lastSync} style={{ marginTop: '0.5rem' }}>
                  Last synced: {formatLastSync(storedTeams.fetchedAtIso)}
                </p>
              )}
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
                        {selectedGame.sport || 'NCAAM'}
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
