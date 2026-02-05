import { Link } from 'react-router-dom'
import styles from './Home.module.css'

const cards = [
  { title: 'My Profile', href: '/my-profile', icon: '👤' },
  { title: 'Roster', href: '/master-roster', icon: '📑' },
  { title: 'BIR Schedule', href: '/bir-schedule', icon: '📅' },
  { title: 'Owners', href: '/owners', icon: '🏢' },
  { title: 'Management', href: '/management', icon: '📋' },
  { title: 'Administrators', href: '/administrators', icon: '🔐' },
]

export default function Home() {
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
