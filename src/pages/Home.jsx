import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ADMIN_USER_ID, DEVELOPER_USER_ID } from '../data/auth'
import { getTraderById } from '../data/traders'
import styles from './Home.module.css'

const BASE_CARDS = [
  { title: 'My Profile', href: '/my-profile', icon: 'User' },
  { title: 'BIR Schedule', href: '/bir-schedule', icon: 'BIR' },
]

const OWNERS_CARD = { title: 'Owners', href: '/owners', icon: 'Owners' }
const MANAGEMENT_CARD = { title: 'Management', href: '/management', icon: 'Mgmt' }
const ADMIN_CARD = { title: 'Administrators', href: '/administrators', icon: 'Admin' }

export default function Home() {
  const { activeTraderId } = useAuth()
  const trader = activeTraderId && activeTraderId !== ADMIN_USER_ID && activeTraderId !== DEVELOPER_USER_ID
    ? getTraderById(activeTraderId)
    : null
  const userLevel = activeTraderId === DEVELOPER_USER_ID
    ? 'Developer'
    : activeTraderId === ADMIN_USER_ID
      ? 'Admin'
      : trader?.appUserLevel || 'User'

  const cards = [
    BASE_CARDS[0],
    { title: 'Roster', href: userLevel === 'User' ? '/my-roster' : '/master-roster', icon: 'Roster' },
    BASE_CARDS[1],
  ]
  if (userLevel === 'Owner' || userLevel === 'Manager' || userLevel === 'Admin' || userLevel === 'Developer') {
    cards.push(OWNERS_CARD)
  }
  if (userLevel === 'Manager' || userLevel === 'Admin' || userLevel === 'Developer') {
    cards.push(MANAGEMENT_CARD)
  }
  if (userLevel === 'Admin' || userLevel === 'Developer') {
    cards.push(ADMIN_CARD)
  }

  return (
    <main className={styles.page}>
      <section className={styles.cards} aria-label="Main navigation">
        {cards.map((card) => (
          <Link key={card.href} to={card.href} className={styles.card}>
            <h2 className={styles.cardTitle}>{card.title}</h2>
            <span className={styles.cardIcon} aria-hidden>
              {card.icon}
            </span>
          </Link>
        ))}
      </section>
    </main>
  )
}
