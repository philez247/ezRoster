import { Link } from 'react-router-dom'
import layoutStyles from './Home.module.css'

const cards = [
  { title: 'Coverage', href: '/owners/resources', icon: 'Planning' },
  { title: 'Requirements', href: '/owners/requirements', icon: 'Needs' },
  { title: 'Audit', href: '/management/pre-allocation-audit', icon: 'Audit' },
  { title: 'Assignment', href: '/owners/assignment', icon: 'Assign' },
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
