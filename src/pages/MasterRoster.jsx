import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getTraders, APP_USER_LEVELS } from '../data/traders'
import { getAllSkills } from '../data/traderSkills'
import layoutStyles from './Home.module.css'
import styles from './MasterRoster.module.css'

const MENU_CARDS = [
  { title: 'Summary', href: '/master-roster?page=summary' },
  { title: 'View Roster', href: '/master-roster?page=view' },
  { title: 'Add Trader', href: '/traders/new' },
  { title: 'Edit Trader', href: '/master-roster?page=edit' },
]

function displayName(trader) {
  return [trader.lastName, trader.firstName].filter(Boolean).join(', ') || trader.alias || trader.traderId
}

function buildSkillSummary(skills) {
  if (!skills.length) return 'No sports'
  return skills
    .slice(0, 3)
    .map((skill) => `${skill.sport} L${skill.level}`)
    .join(' · ')
}

function TraderBrowser({ traders, skillsByTrader, mode }) {
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [sportFilter, setSportFilter] = useState('')
  const [userLevelFilter, setUserLevelFilter] = useState('')
  const [skillLevelFilter, setSkillLevelFilter] = useState('')

  const skills = useMemo(() => Array.from(skillsByTrader.values()).flat(), [skillsByTrader])

  const locationOptions = useMemo(
    () => Array.from(new Set(traders.map((trader) => (trader.location || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [traders]
  )

  const sportOptions = useMemo(
    () => Array.from(new Set(skills.map((skill) => (skill.sport || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [skills]
  )

  const traderCards = useMemo(() => {
    const query = (search || '').trim().toLowerCase()
    return traders.filter((trader) => {
      const traderSkills = skillsByTrader.get(trader.traderId) || []
      if (locationFilter && trader.location !== locationFilter) return false
      if (userLevelFilter && trader.appUserLevel !== userLevelFilter) return false
      if (sportFilter && !traderSkills.some((skill) => skill.sport === sportFilter)) return false
      if (skillLevelFilter && !traderSkills.some((skill) => String(skill.level) === String(skillLevelFilter))) return false
      if (!query) return true
      const haystack = [
        displayName(trader),
        trader.alias,
        trader.location,
        trader.appUserLevel,
        trader.manager,
        traderSkills.map((skill) => `${skill.sport} ${skill.type} ${skill.level}`).join(' '),
      ].join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [locationFilter, search, skillLevelFilter, skillsByTrader, sportFilter, traders, userLevelFilter])

  return (
    <>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>{mode === 'edit' ? 'Edit Trader' : 'View Roster'}</h1>
          <span className={styles.subtitle}>Filter and open trader records</span>
        </div>
        <div className={styles.headerActions}>
          <Link to="/master-roster" className={styles.headerLink}>Back</Link>
          <Link to="/traders/new" className={styles.headerLink}>Add Trader</Link>
        </div>
      </div>

      <div className={styles.filters}>
        <input
          type="text"
          className={styles.input}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search trader, alias, manager..."
        />
        <select className={styles.select} value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}>
          <option value="">All locations</option>
          {locationOptions.map((location) => (
            <option key={location} value={location}>{location}</option>
          ))}
        </select>
        <select className={styles.select} value={sportFilter} onChange={(event) => setSportFilter(event.target.value)}>
          <option value="">All sports</option>
          {sportOptions.map((sport) => (
            <option key={sport} value={sport}>{sport}</option>
          ))}
        </select>
        <select className={styles.select} value={userLevelFilter} onChange={(event) => setUserLevelFilter(event.target.value)}>
          <option value="">All user levels</option>
          {APP_USER_LEVELS.map((level) => (
            <option key={level} value={level}>{level}</option>
          ))}
        </select>
        <select className={styles.select} value={skillLevelFilter} onChange={(event) => setSkillLevelFilter(event.target.value)}>
          <option value="">All skill levels</option>
          {[1, 2, 3].map((level) => (
            <option key={level} value={String(level)}>Level {level}</option>
          ))}
        </select>
      </div>

      <div className={styles.totalsRow}>
        <span>Traders: {traderCards.length}</span>
      </div>

      <div className={styles.cardWindow}>
        <div className={styles.cardList}>
          {traderCards.map((trader) => {
            const traderSkills = skillsByTrader.get(trader.traderId) || []
            return (
              <Link key={trader.traderId} to={`/traders/${trader.traderId}`} className={styles.traderCard}>
                <div className={styles.cardMain}>
                  <div className={styles.cardTop}>
                    <h2 className={styles.cardTitle}>{displayName(trader)}</h2>
                    <span className={styles.cardLevel}>{trader.appUserLevel || 'User'}</span>
                  </div>
                  <div className={styles.cardMetaRow}>
                    <span>{trader.location || 'No location'}</span>
                    <span>{trader.alias || 'No alias'}</span>
                  </div>
                  <div className={styles.cardMetaRow}>
                    <span>Manager: {trader.manager || 'None'}</span>
                  </div>
                  <div className={styles.cardSkills}>{buildSkillSummary(traderSkills)}</div>
                </div>
              </Link>
            )
          })}
          {traderCards.length === 0 && (
            <div className={styles.emptyState}>No traders match the current filters.</div>
          )}
        </div>
      </div>
    </>
  )
}

function SummaryView({ traders, skillsByTrader }) {
  const locationCounts = useMemo(() => {
    const counts = new Map()
    traders.forEach((trader) => {
      const location = (trader.location || 'Unknown').trim() || 'Unknown'
      counts.set(location, (counts.get(location) || 0) + 1)
    })
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [traders])

  const userLevelCounts = useMemo(() => {
    const counts = new Map()
    traders.forEach((trader) => {
      const level = trader.appUserLevel || 'User'
      counts.set(level, (counts.get(level) || 0) + 1)
    })
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [traders])

  const sportCounts = useMemo(() => {
    const counts = new Map()
    skillsByTrader.forEach((skills) => {
      skills.forEach((skill) => {
        counts.set(skill.sport, (counts.get(skill.sport) || 0) + 1)
      })
    })
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [skillsByTrader])

  const activeTraderCount = useMemo(() => traders.filter((trader) => trader.active !== false).length, [traders])

  const primarySkillCount = useMemo(() => {
    let total = 0
    skillsByTrader.forEach((skills) => {
      total += skills.filter((skill) => skill.type === 'Primary').length
    })
    return total
  }, [skillsByTrader])

  const multiSkillTraderCount = useMemo(() => {
    let total = 0
    skillsByTrader.forEach((skills) => {
      if (skills.length >= 2) total += 1
    })
    return total
  }, [skillsByTrader])

  const summaryCards = [
    { title: 'Active Traders', value: activeTraderCount },
    { title: 'Locations', value: locationCounts.length },
    { title: 'Sports Covered', value: sportCounts.length },
    { title: 'Multi-Skilled', value: multiSkillTraderCount },
  ]

  return (
    <>
      <div className={styles.summaryHeader}>
        <div>
          <h1 className={styles.title}>Summary</h1>
          <span className={styles.subtitle}>Trader database overview</span>
        </div>
        <Link to="/master-roster" className={styles.headerLink}>Back</Link>
      </div>

      <section className={styles.summaryStack}>
        <div className={styles.summaryMetricGrid}>
          {summaryCards.map((card) => (
            <article key={card.title} className={styles.metricCard}>
              <span className={styles.metricLabel}>{card.title}</span>
              <strong className={styles.metricValue}>{card.value}</strong>
            </article>
          ))}
        </div>

        <article className={styles.summaryPanel}>
          <div className={styles.summaryPanelHeader}>
            <h2 className={styles.summaryTitle}>Location Breakdown</h2>
            <span className={styles.summaryHint}>{primarySkillCount} primary sports mapped</span>
          </div>
          <ul className={styles.summaryList}>
            {locationCounts.map(([label, count]) => (
              <li key={label}><span>{label}</span><strong>{count}</strong></li>
            ))}
          </ul>
        </article>

        <article className={styles.summaryPanel}>
          <div className={styles.summaryPanelHeader}>
            <h2 className={styles.summaryTitle}>User Levels</h2>
          </div>
          <ul className={styles.summaryList}>
            {userLevelCounts.map(([label, count]) => (
              <li key={label}><span>{label}</span><strong>{count}</strong></li>
            ))}
          </ul>
        </article>

        <article className={styles.summaryPanel}>
          <div className={styles.summaryPanelHeader}>
            <h2 className={styles.summaryTitle}>Top Sports</h2>
            <span className={styles.summaryHint}>Primary and secondary skills</span>
          </div>
          <ul className={styles.summaryList}>
            {sportCounts.map(([label, count]) => (
              <li key={label}><span>{label}</span><strong>{count}</strong></li>
            ))}
          </ul>
        </article>
      </section>
    </>
  )
}

export default function MasterRoster() {
  const [searchParams] = useSearchParams()
  const page = searchParams.get('page') || 'home'
  const traders = useMemo(() => getTraders().filter((trader) => trader.active !== false), [])
  const skills = useMemo(() => getAllSkills(), [])

  const skillsByTrader = useMemo(() => {
    const map = new Map()
    skills.forEach((skill) => {
      if (!skill?.traderId) return
      const list = map.get(skill.traderId) || []
      list.push({
        sport: (skill.sport || '').trim(),
        type: skill.type === 'secondary' ? 'Secondary' : 'Primary',
        level: skill.level === 3 ? 3 : skill.level === 2 ? 2 : 1,
      })
      map.set(skill.traderId, list)
    })
    map.forEach((list) => {
      list.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'Primary' ? -1 : 1
        if (b.level !== a.level) return b.level - a.level
        return a.sport.localeCompare(b.sport)
      })
    })
    return map
  }, [skills])

  return (
    page === 'home' ? (
      <main className={layoutStyles.page}>
        <section className={styles.landingStack} aria-label="Master roster options">
          {MENU_CARDS.map((card) => (
            <Link key={card.href} to={card.href} className={layoutStyles.card}>
              <h2 className={layoutStyles.cardTitle}>{card.title}</h2>
            </Link>
          ))}
        </section>
      </main>
    ) : (
      <main className={`${layoutStyles.page} ${styles.page}`}>
        <section className={styles.section}>
          {page === 'summary' && <SummaryView traders={traders} skillsByTrader={skillsByTrader} />}
          {page === 'view' && <TraderBrowser traders={traders} skillsByTrader={skillsByTrader} mode="view" />}
          {page === 'edit' && <TraderBrowser traders={traders} skillsByTrader={skillsByTrader} mode="edit" />}
        </section>
      </main>
    )
  )
}
