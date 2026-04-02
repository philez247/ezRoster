import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ADMIN_USER_ID, DEVELOPER_USER_ID } from '../data/auth'
import { getTraders } from '../data/traders'
import layoutStyles from './Home.module.css'
import styles from './TraderDbHome.module.css'

const actions = [
  {
    title: 'Configuration',
    href: '/configuration',
    icon: 'Config',
  },
]

function traderDisplayName(trader) {
  return [trader.lastName, trader.firstName].filter(Boolean).join(', ') || trader.alias || trader.traderId
}

function traderOptionLabel(trader) {
  const level = trader.appUserLevel || 'User'
  return `${traderDisplayName(trader)} [${level}]`
}

export default function Administrators() {
  const { activeTraderId, setActiveTraderId } = useAuth()
  const traders = useMemo(() => getTraders().filter((t) => t.active !== false), [])
  const [selectedTraderId, setSelectedTraderId] = useState(activeTraderId || '')
  const [status, setStatus] = useState('')

  useEffect(() => {
    setSelectedTraderId(activeTraderId || '')
  }, [activeTraderId])

  const activeTrader = traders.find((trader) => trader.traderId === activeTraderId)

  const handleApplyTrader = () => {
    const ok = setActiveTraderId(selectedTraderId || null)
    if (!ok) {
      setStatus('Unable to update the current trader.')
      return
    }
    if (selectedTraderId === DEVELOPER_USER_ID) {
      setStatus('Current user updated to Developer.')
      return
    }
    if (selectedTraderId === ADMIN_USER_ID) {
      setStatus('Current user updated to Admin.')
      return
    }
    setStatus('Current trader updated.')
  }

  return (
    <main className={layoutStyles.page}>
      <section className={layoutStyles.cards} aria-label="Administrator actions">
        {actions.map((action) => (
          <Link key={action.href} to={action.href} className={layoutStyles.card}>
            <span className={layoutStyles.cardIcon} aria-hidden>
              {action.icon}
            </span>
            <h2 className={layoutStyles.cardTitle}>{action.title}</h2>
          </Link>
        ))}
      </section>

      <section className={styles.adminPanel} aria-label="Current user selection">
        <div className={styles.adminPanelControls}>
          <label htmlFor="administrator-trader-switch" className={styles.adminLabel}>
            Trader
          </label>
          <select
            id="administrator-trader-switch"
            value={selectedTraderId}
            onChange={(e) => {
              setSelectedTraderId(e.target.value)
              setStatus('')
            }}
            className={styles.adminSelect}
          >
            <option value={DEVELOPER_USER_ID}>Developer [Developer]</option>
            <option value={ADMIN_USER_ID}>Admin [Admin]</option>
            {traders.map((trader) => (
              <option key={trader.traderId} value={trader.traderId}>
                {traderOptionLabel(trader)}
              </option>
            ))}
          </select>
          <button type="button" onClick={handleApplyTrader} className={styles.adminButton}>
            Use this trader
          </button>
        </div>

        <p className={styles.adminMeta}>
          {activeTraderId === DEVELOPER_USER_ID
            ? 'Developer'
            : activeTraderId === ADMIN_USER_ID
              ? 'Admin'
              : activeTrader
                ? `${traderDisplayName(activeTrader)} (${activeTrader.traderId})`
                : 'Developer'}
        </p>
        {status && <p className={styles.adminStatus}>{status}</p>}
      </section>
    </main>
  )
}
