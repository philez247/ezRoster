import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAllSkills } from '../data/traderSkills'
import { getTraders } from '../data/traders'
import { getConfig } from '../config/store'
import styles from './SkillLevels.module.css'

const TYPE_ORDER = ['primary', 'secondary']
const TYPE_LABELS = { primary: 'Primary', secondary: 'Secondary' }
const LEVEL_ORDER = [1, 2, 3]

function traderDisplayName(trader) {
  if (!trader) return '—'
  return [trader.lastName, trader.firstName].filter(Boolean).join(', ') || trader.alias || '—'
}

/** Group skills by location → sport → type → level. Returns nested structure with trader entries. */
function groupSkills(allSkills, tradersMap, mainLocations) {
  const mainSet = new Set(mainLocations)
  const byLocation = {}
  allSkills.forEach((skill) => {
    const trader = tradersMap[skill.traderId]
    const rawLoc = (trader?.location || '').trim() || '—'
    const loc = mainSet.has(rawLoc) ? rawLoc : 'Other'
    const sport = (skill.sport || '').trim() || '—'
    const type = skill.type === 'secondary' ? 'secondary' : 'primary'
    const level = skill.level === 2 ? 2 : skill.level === 3 ? 3 : 1
    if (!byLocation[loc]) byLocation[loc] = {}
    if (!byLocation[loc][sport]) byLocation[loc][sport] = {}
    if (!byLocation[loc][sport][type]) byLocation[loc][sport][type] = {}
    if (!byLocation[loc][sport][type][level]) byLocation[loc][sport][type][level] = []
    byLocation[loc][sport][type][level].push({ skill, trader })
  })
  return byLocation
}

export default function SkillLevels() {
  const [config, setConfig] = useState(() => getConfig())
  const [sportFilter, setSportFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  useEffect(() => {
    setConfig(getConfig())
  }, [])

  const allSkills = useMemo(() => getAllSkills(), [])
  const tradersMap = useMemo(() => {
    const list = getTraders()
    return Object.fromEntries(list.map((t) => [t.traderId, t]))
  }, [])

  const mainLocations = useMemo(() => {
    const cfg = getConfig()
    return cfg.locations ?? []
  }, [config])

  const filteredSkills = useMemo(() => {
    let list = allSkills
    if (sportFilter.trim()) {
      list = list.filter((s) => (s.sport || '').toLowerCase() === sportFilter.trim().toLowerCase())
    }
    if (typeFilter === 'primary' || typeFilter === 'secondary') {
      list = list.filter((s) => s.type === typeFilter)
    }
    return list
  }, [allSkills, sportFilter, typeFilter])

  const grouped = useMemo(
    () => groupSkills(filteredSkills, tradersMap, mainLocations),
    [filteredSkills, tradersMap, mainLocations]
  )

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

  const sports = useMemo(() => {
    const set = new Set(allSkills.map((s) => s.sport).filter(Boolean))
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [allSkills])

  const [expandedLoc, setExpandedLoc] = useState(() => new Set())
  const [expandedSport, setExpandedSport] = useState(() => new Set())
  const [expandedType, setExpandedType] = useState(() => new Set())
  const [expandedLevel, setExpandedLevel] = useState(() => new Set())

  const toggle = (setter, key) => {
    setter((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const countAtLocation = (loc) => {
    const locData = grouped[loc] || {}
    let n = 0
    Object.values(locData).forEach((bySport) => {
      Object.values(bySport).forEach((byType) => {
        Object.values(byType).forEach((arr) => { n += arr.length })
      })
    })
    return n
  }

  return (
    <main className={styles.page}>
      <div className={styles.filters}>
        <select
          value={sportFilter}
          onChange={(e) => setSportFilter(e.target.value)}
          className={styles.sportSelect}
          aria-label="Filter by sport"
        >
          <option value="">Sports</option>
          {sports.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className={styles.typeSelect}
          aria-label="Filter by primary or secondary"
        >
          <option value="">Primary/Secondary</option>
          <option value="primary">Primary</option>
          <option value="secondary">Secondary</option>
        </select>
      </div>

      <div className={styles.scrollWrap}>
        <ul className={styles.list} aria-label="Skill levels by location">
          {displayLocations.map((location) => {
            const locData = grouped[location] || {}
            const sportsInLoc = Object.keys(locData).sort((a, b) => a.localeCompare(b))
            const total = countAtLocation(location)
            const isLocOpen = expandedLoc.has(location)
            return (
              <li key={location}>
                <section className={styles.locationCard} aria-label={`Location: ${location}`}>
                  <button
                    type="button"
                    className={styles.locationHeader}
                    onClick={() => toggle(setExpandedLoc, location)}
                    aria-expanded={isLocOpen}
                  >
                    <span className={styles.locationTitle}>{location}</span>
                    <span className={styles.locationCount}>({total})</span>
                    <span className={styles.locationChevron} aria-hidden data-open={isLocOpen}>
                      ▼
                    </span>
                  </button>
                  {isLocOpen && (
                    <div className={styles.nestedGroups}>
                      {sportsInLoc.map((sport) => {
                        const byType = locData[sport] || {}
                        const typesInSport = Object.keys(byType).sort((a, b) =>
                          a === 'primary' ? -1 : b === 'primary' ? 1 : a.localeCompare(b)
                        )
                        const sportTotal = typesInSport.reduce(
                          (sum, t) =>
                            sum +
                            (LEVEL_ORDER.reduce(
                              (s, lv) => s + (byType[t]?.[lv]?.length || 0),
                              0
                            ) || 0),
                          0
                        )
                        const sportKey = `${location}::${sport}`
                        const isSportOpen = expandedSport.has(sportKey)
                        return (
                          <div key={sport} className={styles.sportBlock}>
                            <button
                              type="button"
                              className={styles.sportHeader}
                              onClick={() => toggle(setExpandedSport, sportKey)}
                              aria-expanded={isSportOpen}
                            >
                              <span className={styles.sportTitle}>
                                {sport}
                                <span className={styles.count}> ({sportTotal})</span>
                              </span>
                              <span className={styles.chevron} aria-hidden data-open={isSportOpen}>
                                ▼
                              </span>
                            </button>
                            {isSportOpen && (
                              <div className={styles.typeGroups}>
                                {TYPE_ORDER.filter((t) => byType[t]).map((type) => {
                                  const byLevel = byType[type] || {}
                                  const levelsInType = LEVEL_ORDER.filter((lv) => byLevel[lv]?.length)
                                  const typeTotal = levelsInType.reduce(
                                    (s, lv) => s + (byLevel[lv]?.length || 0),
                                    0
                                  )
                                  const typeKey = `${sportKey}::${type}`
                                  const isTypeOpen = expandedType.has(typeKey)
                                  return (
                                    <div key={type} className={styles.typeBlock}>
                                      <button
                                        type="button"
                                        className={styles.typeHeader}
                                        onClick={() => toggle(setExpandedType, typeKey)}
                                        aria-expanded={isTypeOpen}
                                      >
                                        <span className={styles.typeTitle}>
                                          {TYPE_LABELS[type]}
                                          <span className={styles.count}> ({typeTotal})</span>
                                        </span>
                                        <span
                                          className={styles.chevron}
                                          aria-hidden
                                          data-open={isTypeOpen}
                                        >
                                          ▼
                                        </span>
                                      </button>
                                      {isTypeOpen && (
                                        <div className={styles.levelGroups}>
                                          {levelsInType.map((level) => {
                                            const entries = byLevel[level] || []
                                            const levelKey = `${typeKey}::${level}`
                                            const isLevelOpen = expandedLevel.has(levelKey)
                                            return (
                                              <div key={level} className={styles.levelBlock}>
                                                <button
                                                  type="button"
                                                  className={styles.levelHeader}
                                                  onClick={() => toggle(setExpandedLevel, levelKey)}
                                                  aria-expanded={isLevelOpen}
                                                >
                                                  <span className={styles.levelTitle}>
                                                    Level {level}
                                                    <span className={styles.count}>
                                                      {' '}
                                                      ({entries.length})
                                                    </span>
                                                  </span>
                                                  <span
                                                    className={styles.chevron}
                                                    aria-hidden
                                                    data-open={isLevelOpen}
                                                  >
                                                    ▼
                                                  </span>
                                                </button>
                                                {isLevelOpen && entries.length > 0 && (
                                                  <ul className={styles.traderList}>
                                                    {entries.map(({ skill, trader }) => (
                                                      <li key={skill.id} className={styles.row}>
                                                        <Link
                                                          to={`/traders/${skill.traderId}`}
                                                          className={styles.name}
                                                        >
                                                          {traderDisplayName(trader)}
                                                        </Link>
                                                        {trader?.alias && (
                                                          <span className={styles.alias}>
                                                            {trader.alias}
                                                          </span>
                                                        )}
                                                      </li>
                                                    ))}
                                                  </ul>
                                                )}
                                              </div>
                                            )
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
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
      {allSkills.length === 0 && (
        <p className={styles.empty}>
          No skill levels assigned yet. Add sports and levels in trader profiles.
        </p>
      )}
    </main>
  )
}
