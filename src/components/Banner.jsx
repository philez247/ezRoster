import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import styles from './Banner.module.css'

const PATH_TITLES = {
  '/': 'EZ Roster',
  '/my-profile': 'My Profile',
  '/master-roster': 'Roster',
  '/bir-schedule': 'BIR Schedule',
  '/bir-schedule/main': 'BIR Schedule',
  '/bir-schedule/espn-scraper': 'Schedule Scraping',
  '/owners': 'Owners',
  '/management': 'Management',
  '/management/day-report': 'Games & Availability',
  '/management/view-day': 'View Day',
  '/management/skill-levels': 'Skill Levels',
  '/traders': 'Trader Database',
  '/traders/list': 'Traders',
  '/traders/new': 'Add Trader',
  '/traders/preferences': 'Preferences',
  '/traders/availability': 'Availability',
  '/configuration': 'Configuration',
  '/administrators': 'Administrators',
}

function getPageTitle(pathname) {
  if (PATH_TITLES[pathname]) return PATH_TITLES[pathname]
  if (pathname.startsWith('/traders/') && pathname !== '/traders/list' && pathname !== '/traders/new' && pathname !== '/traders/preferences' && pathname !== '/traders/availability')
    return 'Trader Profile'
  if (pathname.startsWith('/bir-schedule/espn-scraper/'))
    return 'Schedule Scraping'
  return 'EZ Roster'
}

/** Link target for the title: e.g. from NBA scraper go to Schedule Scraping index */
function getTitleHref(pathname) {
  if (pathname.startsWith('/bir-schedule/espn-scraper/'))
    return '/bir-schedule/espn-scraper'
  return pathname
}

export default function Banner() {
  const location = useLocation()
  const { logout } = useAuth()
  const pageTitle = getPageTitle(location.pathname)
  const titleHref = getTitleHref(location.pathname)

  return (
    <header className={styles.banner} role="banner">
      <Link
        to={titleHref}
        className={styles.pageTitle}
        aria-label={`Go to ${pageTitle}`}
      >
        {pageTitle}
      </Link>
      <div className={styles.bannerActions}>
        <Link
          to="/"
          className={styles.homeBtn}
          aria-label="Go to home"
        >
          Home
        </Link>
        <button
          type="button"
          onClick={logout}
          className={styles.logoutBtn}
          aria-label="Sign out"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
