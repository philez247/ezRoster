import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAvailabilityReport } from '../data/availabilityReport'
import { getTraders } from '../data/traders'
import { getConfig } from '../config/store'
import { getAllSkills } from '../data/traderSkills'
import styles from './AvailabilityReport.module.css'

const STATUS_ORDER = ['no_preference', 'available', 'preferred_in', 'unavailable', 'preferred_off']
const STATUS_LABELS = {
  no_preference: 'No Preference',
  available: 'In',
  preferred_in: 'Preferred In',
  unavailable: 'Off',
  preferred_off: 'Preferred Off',
}

function todayDateStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Group report rows by location, then by status. Returns { locationLabel: { status: [rows] } }.
 * mainLocations: locations that stay as-is (Dublin, Melbourne, etc). All others go under "Other". */
function groupByLocationThenStatus(report, mainLocations = []) {
  const byLocation = {}
  const mainSet = new Set(mainLocations)
  report.forEach((row) => {
    const raw = (row.location || '').trim() || '—'
    const loc = mainSet.has(raw) ? raw : 'Other'
    if (!byLocation[loc]) byLocation[loc] = {}
    STATUS_ORDER.forEach((s) => {
      if (!byLocation[loc][s]) byLocation[loc][s] = []
      if (row.status === s) byLocation[loc][s].push(row)
    })
  })
  const locations = Object.keys(byLocation).sort((a, b) => a.localeCompare(b))
  return { byLocation, locations }
}

export default function AvailabilityReport() {
  const [config, setConfig] = useState(() => getConfig())
  const [selectedDay, setSelectedDay] = useState('')
  const [sportFilter, setSportFilter] = useState('')

  useEffect(() => {
    setConfig(getConfig())
  }, [])

  useEffect(() => {
    const refreshConfig = () => setConfig(getConfig())
    window.addEventListener('focus', refreshConfig)
    return () => window.removeEventListener('focus', refreshConfig)
  }, [])

  const report = useMemo(() => {
    if (!selectedDay || selectedDay.length < 10) return []
    return getAvailabilityReport(selectedDay)
  }, [selectedDay])

  const traderIdsWithSport = useMemo(() => {
    if (!sportFilter || sportFilter === '') return null
    const skills = getAllSkills().filter(
      (s) => (s.sport || '').toLowerCase() === sportFilter.trim().toLowerCase()
    )
    return new Set(skills.map((s) => s.traderId))
  }, [sportFilter])

  const filteredReport = useMemo(() => {
    let rows = report
    if (traderIdsWithSport !== null) {
      rows = rows.filter((row) => traderIdsWithSport.has(row.traderId))
    }
    return rows
  }, [report, traderIdsWithSport])

  /** Main locations from config (Dublin, Melbourne, New Jersey). "Other" catches anything else. */
  const mainLocations = useMemo(() => {
    const cfg = getConfig()
    return cfg.locations ?? []
  }, [config])

  const { byLocation } = useMemo(
    () => groupByLocationThenStatus(filteredReport, mainLocations),
    [filteredReport, mainLocations]
  )

  /** Locations from config + "Other" for non-matching locations. Fallback to traders' locations when config is empty. */
  const displayLocations = useMemo(() => {
    const cfg = getConfig()
    if (cfg.locations?.length > 0) {
      const list = [...cfg.locations].sort((a, b) => a.localeCompare(b))
      if (!list.includes('Other')) list.push('Other')
      return list
    }
    const fromTraders = [...new Set(getTraders().map((t) => {
      const loc = (t.location || '').trim() || '—'
      return mainLocations.includes(loc) ? loc : 'Other'
    }))]
    return [...new Set([...fromTraders.filter((l) => mainLocations.includes(l)), 'Other'])]
      .filter(Boolean)
      .sort((a, b) => (a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b)))
  }, [config, mainLocations])

  const [expandedLocations, setExpandedLocations] = useState(() => new Set())
  const [expandedStatus, setExpandedStatus] = useState(() => new Set())

  const toggleLocation = (location) => {
    setExpandedLocations((prev) => {
      const next = new Set(prev)
      if (next.has(location)) next.delete(location)
      else next.add(location)
      return next
    })
  }

  const toggleStatus = (location, status) => {
    const key = `${location}::${status}`
    setExpandedStatus((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <main className={styles.page}>
      <div className={styles.filters}>
        <input
          id="report-day"
          type="date"
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
          className={styles.dateInput}
          aria-label="Filter by date"
        />
        <select
          id="report-sport"
          value={sportFilter}
          onChange={(e) => setSportFilter(e.target.value)}
          className={styles.sportSelect}
          aria-label="Filter by sport"
        >
          <option value="">All sports</option>
          {config.sports.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.scrollWrap}>
        <ul className={styles.list} aria-label="Location list">
          {displayLocations.map((location) => {
            const isLocationExpanded = expandedLocations.has(location)
            const hasDate = selectedDay && selectedDay.length >= 10
            const total = hasDate
              ? STATUS_ORDER.reduce(
                  (sum, s) => sum + (byLocation[location]?.[s]?.length || 0),
                  0
                )
              : 0
            return (
              <li key={location}>
                <section
                  className={styles.locationCard}
                  aria-label={`Location: ${location}`}
                >
                  <button
                    type="button"
                    className={styles.locationHeader}
                    onClick={() => toggleLocation(location)}
                    aria-expanded={isLocationExpanded}
                  >
                    <span className={styles.locationTitle}>{location}</span>
                    <span className={styles.locationCount}>({total})</span>
                    <span
                      className={styles.locationChevron}
                      aria-hidden
                      data-open={isLocationExpanded}
                    >
                      ▼
                    </span>
                  </button>
                  {isLocationExpanded && (
                    <div className={styles.statusGroups}>
                      {STATUS_ORDER.map((status) => {
                        const rows = byLocation[location]?.[status] || []
                        const key = `${location}::${status}`
                        const isStatusExpanded = expandedStatus.has(key)
                        return (
                          <div
                            key={status}
                            className={styles.statusBlock}
                            data-status={status}
                          >
                            <button
                              type="button"
                              className={styles.statusHeader}
                              onClick={() => toggleStatus(location, status)}
                              aria-expanded={isStatusExpanded}
                            >
                              <span className={styles.statusTitle}>
                                {STATUS_LABELS[status]}
                                <span className={styles.count}>
                                  {' '}
                                  ({rows.length})
                                </span>
                              </span>
                              <span
                                className={styles.statusChevron}
                                aria-hidden
                                data-open={isStatusExpanded}
                              >
                                ▼
                              </span>
                            </button>
                            {isStatusExpanded && rows.length > 0 && (
                              <ul className={styles.traderList}>
                                {rows.map((row) => (
                                  <li key={row.traderId} className={styles.row}>
                                    <div className={styles.rowLeft}>
                                      <Link
                                        to={`/traders/${row.traderId}`}
                                        className={styles.name}
                                      >
                                        {row.name}
                                      </Link>
                                      {row.alias && (
                                        <span className={styles.alias}>
                                          {row.alias}
                                        </span>
                                      )}
                                    </div>
                                    <span
                                      className={
                                        row.source === 'REQUEST'
                                          ? styles.badgeRequest
                                          : styles.badgePreference
                                      }
                                    >
                                      {row.source === 'REQUEST'
                                        ? 'Request'
                                        : 'Preference'}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </section>
              </li>
            )
          })}
        </ul>
      </div>
    </main>
  )
}
