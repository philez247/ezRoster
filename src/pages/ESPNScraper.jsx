import { Link } from 'react-router-dom'
import styles from './ESPNScraper.module.css'

const sports = [
  { title: 'All Sports', slug: 'all-sports', icon: '🌐' },
  { title: 'NFL', slug: 'nfl', icon: '🏈' },
  { title: 'MLB', slug: 'mlb', icon: '⚾' },
  { title: 'NBA', slug: 'nba', icon: '🏀' },
  { title: 'NHL', slug: 'nhl', icon: '🏒' },
  { title: 'CFB', slug: 'cfb', icon: '🏈', iconClass: 'iconBlue' },
  { title: 'CBB', slug: 'cbb', icon: '🏀', iconClass: 'iconBlue' },
  { title: 'WNBA', slug: 'wnba', icon: '🏀', iconClass: 'iconPink' },
]

export default function ESPNScraper() {
  return (
    <main className={styles.page}>
      <div className={styles.scrollWrap}>
        <section className={styles.cards} aria-label="Schedule Scraping sports">
          {sports.map((sport) => (
            <Link
              key={sport.slug}
              to={`/bir-schedule/espn-scraper/${sport.slug}`}
              className={styles.card}
            >
              <h2 className={styles.cardTitle}>{sport.title}</h2>
              <span
                className={`${styles.cardIcon}${sport.iconClass ? ` ${styles[sport.iconClass]}` : ''}`}
                aria-hidden
              >
                {sport.icon}
              </span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  )
}
