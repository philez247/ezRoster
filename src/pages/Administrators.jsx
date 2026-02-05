import { Link } from 'react-router-dom'
import layoutStyles from './Home.module.css'
import styles from './TraderDbHome.module.css'

const actions = [
  {
    title: 'Configuration',
    description: 'Sports, locations, managers and other options.',
    href: '/configuration',
    icon: '⚙️',
  },
]

export default function Administrators() {
  return (
    <main className={layoutStyles.page}>
      <Link to="/" className={styles.back}>
        ← Home
      </Link>
      <header className={layoutStyles.header}>
        <h1 className={layoutStyles.title}>Administrators</h1>
        <p className={layoutStyles.subtitle}>Admin settings and configuration</p>
      </header>

      <section className={layoutStyles.cards} aria-label="Administrator actions">
        {actions.map((action) => (
          <Link key={action.href} to={action.href} className={layoutStyles.card}>
            <span className={layoutStyles.cardIcon} aria-hidden>
              {action.icon}
            </span>
            <h2 className={layoutStyles.cardTitle}>{action.title}</h2>
            <p className={layoutStyles.cardDesc}>{action.description}</p>
          </Link>
        ))}
      </section>
    </main>
  )
}
