import { Link } from 'react-router-dom'
import layoutStyles from './Home.module.css'

const cards = [
  { title: 'Add Trader', href: '/traders/new', icon: '➕' },
  { title: 'Traders', href: '/traders/list', icon: '👥' },
  { title: 'Preferences', href: '/traders/preferences', icon: '⚙️' },
  { title: 'Availability', href: '/traders/availability', icon: '📅' },
]

export default function TraderDbHome() {
  return (
    <main className={layoutStyles.page}>
      <section className={layoutStyles.cards} aria-label="Trader Database navigation">
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
