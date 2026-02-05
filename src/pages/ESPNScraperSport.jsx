import { Link, useParams } from 'react-router-dom'
import NbaScraperPage from '../scrapers/nba/NbaScraperPage'
import NflScraperPage from '../scrapers/nfl/NflScraperPage'
import NhlScraperPage from '../scrapers/nhl/NhlScraperPage'
import WnbaScraperPage from '../scrapers/wnba/WnbaScraperPage'
import MlbScraperPage from '../scrapers/mlb/MlbScraperPage'
import CfbScraperPage from '../scrapers/cfb/CfbScraperPage'
import NcaamScraperPage from '../scrapers/ncaam/NcaamScraperPage'
import AllSportsScraperPage from '../scrapers/allSports/AllSportsScraperPage'
import layoutStyles from './Home.module.css'
import styles from './Placeholder.module.css'

const SPORT_LABELS = {
  nfl: 'NFL',
  mlb: 'MLB',
  nba: 'NBA',
  nhl: 'NHL',
  cfb: 'CFB',
  cbb: 'CBB',
  wnba: 'WNBA',
  all: 'All Sports',
}

export default function ESPNScraperSport() {
  const { sport } = useParams()

  if (sport === 'nba') return <NbaScraperPage />
  if (sport === 'nfl') return <NflScraperPage />
  if (sport === 'nhl') return <NhlScraperPage />
  if (sport === 'wnba') return <WnbaScraperPage />
  if (sport === 'mlb') return <MlbScraperPage />
  if (sport === 'cfb') return <CfbScraperPage />
  if (sport === 'cbb') return <NcaamScraperPage />
  if (sport === 'all') return <AllSportsScraperPage />

  const label = SPORT_LABELS[sport] || sport || 'Sport'
  return (
    <main className={layoutStyles.page}>
      <Link to="/bir-schedule/espn-scraper" className={styles.back}>
        ← ESPN Scraper
      </Link>
      <h1 className={styles.title}>{label}</h1>
      <p className={styles.desc}>Schedule Scraping content for {label} will go here.</p>
    </main>
  )
}
