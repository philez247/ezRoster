import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getTraders } from '../data/traders'
import { getConfig } from '../config/store'
import styles from './Traders.module.css'

function matchSearch(trader, q) {
  if (!q.trim()) return true
  const lower = q.trim().toLowerCase()
  const name = [trader.firstName, trader.lastName].filter(Boolean).join(' ').toLowerCase()
  const alias = (trader.alias || '').toLowerCase()
  return name.includes(lower) || alias.includes(lower)
}

export default function Traders() {
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('')

  const config = useMemo(() => getConfig(), [])
  const allTraders = useMemo(() => getTraders(), [])

  const filtered = useMemo(() => {
    return allTraders.filter((t) => {
      if (!matchSearch(t, search)) return false
      if (locationFilter && t.location !== locationFilter) return false
      return true
    })
  }, [allTraders, search, locationFilter])

  const locations = useMemo(() => {
    const fromTraders = [...new Set(allTraders.map((t) => t.location).filter(Boolean))].sort()
    return fromTraders.length ? fromTraders : config.locations
  }, [allTraders, config.locations])

  return (
    <main className={styles.page}>
      <div className={styles.filters}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search"
          className={styles.searchInput}
          aria-label="Search by name or alias"
        />
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className={styles.locationSelect}
          aria-label="Filter by location"
        >
          <option value="">Location</option>
          {locations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
      </div>

      {allTraders.length === 0 ? (
        <p className={styles.empty}>
          No traders yet. <Link to="/management">Add a trader</Link> from Management.
        </p>
      ) : (
        <div className={styles.scrollWrap}>
          <ul className={styles.list} aria-label="Trader list">
            {filtered.map((t) => (
              <li key={t.traderId}>
                <Link to={`/traders/${t.traderId}`} className={styles.card}>
                  <div className={styles.cardLeft}>
                    <span className={styles.cardName}>
                      {[t.lastName, t.firstName].filter(Boolean).join(', ') || '—'}
                    </span>
                    {t.alias && (
                      <span className={styles.cardAlias}>@{t.alias}</span>
                    )}
                  </div>
                  {t.location && (
                    <span className={styles.cardLocation}>{t.location}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          {filtered.length === 0 && (
            <p className={styles.noResults}>No traders match your search or filter.</p>
          )}
        </div>
      )}
    </main>
  )
}
