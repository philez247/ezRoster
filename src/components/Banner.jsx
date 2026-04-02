import { Link, useLocation, useNavigate } from 'react-router-dom'
import styles from './Banner.module.css'

function getPageTitle(pathname, search) {
  const params = new URLSearchParams(search)
  if (pathname === '/') return 'Home'
  if (pathname === '/my-profile') return 'My Profile'
  if (pathname === '/my-availability') return 'Availability'
  if (pathname === '/my-sports') return 'Sports'
  if (pathname === '/my-roster') return 'My Roster'
  if (pathname === '/owners') return 'Owners'
  if (pathname === '/owners/resources') return 'Coverage'
  if (pathname === '/owners/requirements') return 'Requirements'
  if (pathname === '/owners/assignment') return 'Assignment'
  if (pathname === '/management') return 'Management'
  if (pathname === '/management/allocation-engine') return 'Allocation Engine'
  if (pathname === '/management/availability-report') return 'Availability Report'
  if (pathname === '/management/requests') return 'Requests'
  if (pathname === '/master-roster') {
    const page = params.get('page') || 'home'
    if (page === 'summary') return 'Summary'
    if (page === 'view') return 'View Roster'
    if (page === 'edit') return 'Edit Trader'
    return 'Master Roster'
  }
  if (pathname === '/traders') return 'Trader Database'
  if (pathname === '/traders/list') return 'All Traders'
  if (pathname === '/traders/new') return 'Add Trader'
  if (pathname === '/traders/preferences') return 'Preferences'
  if (pathname === '/traders/availability') return 'Availability'
  if (pathname.startsWith('/traders/')) return 'Trader'
  if (pathname === '/administrators') return 'Administrators'
  if (pathname === '/configuration') return 'Configuration'
  if (pathname === '/bir-schedule') return 'BIR Schedule'
  if (pathname === '/bir-schedule/main') return 'Schedule'
  if (pathname === '/bir-schedule/espn-scraper') return 'ESPN Scraper'
  if (pathname.startsWith('/bir-schedule/espn-scraper/')) return 'ESPN Scraper'
  return 'EZ Roster'
}

export default function Banner() {
  const navigate = useNavigate()
  const location = useLocation()
  const pageTitle = getPageTitle(location.pathname, location.search)

  return (
    <header className={styles.banner} role="banner">
      <Link
        to="/"
        className={styles.homeBtn}
        aria-label="Go to home"
      >
        Home
      </Link>
      <span className={styles.identity} aria-label="Current page">
        {pageTitle}
      </span>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className={styles.backBtn}
        aria-label="Go back"
      >
        Back
      </button>
    </header>
  )
}
