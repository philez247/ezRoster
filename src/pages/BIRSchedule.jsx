import { Link } from 'react-router-dom'
import layoutStyles from './Home.module.css'

const cards = [
  { title: 'BIR Schedule', href: '/bir-schedule/main', icon: '📅' },
  { title: 'Schedule Scraping', href: '/bir-schedule/espn-scraper', icon: '🌐' },
]

export default function BIRSchedule() {
  return (
    <main className={layoutStyles.page}>
      <section className={layoutStyles.cards} aria-label="BIR Schedule options">
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
