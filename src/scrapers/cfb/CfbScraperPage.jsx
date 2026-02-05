import { useState } from 'react'
import { Link } from 'react-router-dom'
import { syncCfbTeamsD1 } from '../../services/espnCfbTeams'
import { getCfbTeamsD1 } from '../../data/cfbTeams'
import { formatDatePhone } from '../../utils/dateFormat'
import styles from './CfbScraper.module.css'

function formatLastSync(iso) {
  if (!iso) return null
  return formatDatePhone(iso)
}

export default function CfbScraperPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [stored, setStored] = useState(() => getCfbTeamsD1())

  const refreshStored = () => setStored(getCfbTeamsD1())

  const handleSyncTeams = async () => {
    setError(null)
    setLoading(true)
    try {
      await syncCfbTeamsD1()
      refreshStored()
    } catch (err) {
      setError(err.message || 'Sync failed')
    } finally {
      setLoading(false)
    }
  }

  const teams = stored?.teams || []
  const fbsCount = teams.filter((t) => t.group === 'FBS').length
  const fcsCount = teams.filter((t) => t.group === 'FCS').length

  return (
    <main className={styles.page}>
      <Link to="/bir-schedule/espn-scraper" className={styles.back}>
        ← Schedule Scraping
      </Link>

      <div className={styles.card}>
        <h1 className={styles.title}>
          <span className={styles.icon} aria-hidden>🏈</span>
          CFB Schedule Scraper
        </h1>

        <p className={styles.sectionTitle}>Step 1: Division I Teams (D1 v D1)</p>
        <p>
          Sync the list of FBS + FCS teams from ESPN. This list is used to filter games to only D1 vs D1 matchups.
        </p>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={handleSyncTeams}
            disabled={loading}
            className={styles.syncBtn}
            aria-label="Sync CFB Division I teams from ESPN"
          >
            {loading ? 'Syncing…' : 'Sync CFB Division I Teams'}
          </button>
        </div>

        {teams.length > 0 && (
          <div className={styles.stats}>
            <p>Total teams: {teams.length}</p>
            <p>FBS: {fbsCount}</p>
            <p>FCS: {fcsCount}</p>
          </div>
        )}

        {stored?.fetchedAtIso && (
          <p className={styles.lastSync}>
            Last synced: {formatLastSync(stored.fetchedAtIso)}
          </p>
        )}

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </main>
  )
}
