import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ADMIN_USER_ID, DEVELOPER_USER_ID } from '../data/auth'
import { getTraderById } from '../data/traders'
import layoutStyles from './Home.module.css'
import styles from './MyProfile.module.css'

function buildCards(trader) {
  if (!trader) return []

  return [
    {
      title: 'My Roster',
      href: '/my-roster',
    },
    {
      title: 'Preferences',
      href: '/traders/preferences',
    },
    {
      title: 'Requests',
      href: '/traders/availability',
    },
    {
      title: 'Sports',
      href: '/my-sports',
    },
    {
      title: 'My Profile',
      href: `/traders/${trader.traderId}`,
    },
    {
      title: 'Availability',
      href: '/my-availability',
    },
  ]
}

export default function MyProfile() {
  const { logout, activeTraderId } = useAuth()
  const isDeveloper = activeTraderId === DEVELOPER_USER_ID
  const isAdmin = activeTraderId === ADMIN_USER_ID
  const trader = activeTraderId && !isAdmin && !isDeveloper ? getTraderById(activeTraderId) : null

  if (isDeveloper) {
    return (
      <main className={layoutStyles.page}>
        <section className={layoutStyles.cards}>
          <Link to="/administrators" className={layoutStyles.card}>
            <div className={styles.cardCopy}>
              <h2 className={layoutStyles.cardTitle}>Choose User</h2>
            </div>
          </Link>
          <button type="button" onClick={logout} className={`${layoutStyles.card} ${styles.actionCard}`}>
            <div className={styles.cardCopy}>
              <h2 className={layoutStyles.cardTitle}>Sign Out</h2>
            </div>
          </button>
        </section>
      </main>
    )
  }

  if (isAdmin) {
    return (
      <main className={layoutStyles.page}>
        <section className={layoutStyles.cards}>
          <div className={`${layoutStyles.card} ${styles.summaryCard}`}>
            <div className={styles.cardCopy}>
              <h2 className={layoutStyles.cardTitle}>Admin</h2>
            </div>
          </div>
          <button type="button" onClick={logout} className={`${layoutStyles.card} ${styles.actionCard}`}>
            <div className={styles.cardCopy}>
              <h2 className={layoutStyles.cardTitle}>Sign Out</h2>
            </div>
          </button>
        </section>
      </main>
    )
  }

  if (!trader) {
    return (
      <main className={layoutStyles.page}>
        <section className={layoutStyles.cards}>
          <Link to="/administrators" className={layoutStyles.card}>
            <div className={styles.cardCopy}>
              <h2 className={layoutStyles.cardTitle}>Choose User</h2>
            </div>
          </Link>
          <button type="button" onClick={logout} className={`${layoutStyles.card} ${styles.actionCard}`}>
            <div className={styles.cardCopy}>
              <h2 className={layoutStyles.cardTitle}>Sign Out</h2>
            </div>
          </button>
        </section>
      </main>
    )
  }

  const cards = buildCards(trader)

  return (
    <main className={layoutStyles.page}>
      <section className={layoutStyles.cards} aria-label="My profile options">
        {cards.map((card) => (
          <Link key={card.title} to={card.href} className={layoutStyles.card}>
            <div className={styles.cardCopy}>
              <h2 className={layoutStyles.cardTitle}>{card.title}</h2>
            </div>
          </Link>
        ))}
        <button type="button" onClick={logout} className={`${layoutStyles.card} ${styles.actionCard}`}>
          <div className={styles.cardCopy}>
            <h2 className={layoutStyles.cardTitle}>Sign Out</h2>
          </div>
        </button>
      </section>
    </main>
  )
}
