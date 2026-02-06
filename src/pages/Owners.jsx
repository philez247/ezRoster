import { Link } from 'react-router-dom'
import layoutStyles from './Home.module.css'

const cards = [
  { title: 'Coverage', href: '/owners/coverage', icon: '📊' },
  { title: 'Resources', href: '/owners/resources', icon: '📚' },
  { title: 'Shift Assignment', href: '/owners/shift-assignment', icon: '📋' },
]

export default function Owners() {
  return (
    <main className={layoutStyles.page}>
      <section className={layoutStyles.cards} aria-label="Owners options">
        {cards.map((card) => (
          <Link key={card.href} to={card.href} className={layoutStyles.card}>
            <h2 className={layoutStyles.cardTitle}>{card.title}</h2>
            <span className={layoutStyles.cardIcon} aria-hidden>
              {card.icon}
            </span>
          </Link>
        ))}
      </section>
    </main>
  )
}
