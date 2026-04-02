import { Link } from 'react-router-dom'
import layoutStyles from './Home.module.css'

const actions = [
  { title: 'Shift Requirements', href: '/management/shift-requirements', icon: 'Needs' },
  { title: 'Pre-Allocation Audit', href: '/management/pre-allocation-audit', icon: 'Audit' },
  { title: 'Allocation Engine', href: '/management/allocation-engine', icon: 'Engine' },
  { title: 'Master Roster', href: '/master-roster', icon: 'Roster' },
  { title: 'Availability Report', href: '/management/availability-report', icon: 'Avail' },
  { title: 'Requests', href: '/management/requests', icon: 'Req' },
]

export default function Management() {
  return (
    <main className={layoutStyles.page}>
      <section className={layoutStyles.cards} aria-label="Management overview">
        {actions.map((action) => (
          <Link key={action.href} to={action.href} className={layoutStyles.card}>
            <h2 className={layoutStyles.cardTitle}>{action.title}</h2>
            <span className={layoutStyles.cardIcon} aria-hidden>
              {action.icon}
            </span>
          </Link>
        ))}
      </section>
    </main>
  )
}
