import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getTraders } from '../data/traders'
import layoutStyles from './Home.module.css'

const actions = [
  { title: 'View Day', href: '/management/view-day', icon: '📅' },
  { title: 'Trader Database', href: '/traders', icon: '👥' },
  { title: 'View Skill Levels', href: '/management/skill-levels', icon: '📊' },
  { title: 'Availability Report', href: '/management/availability-report', icon: '📅' },
  { title: 'Games & Availability by Day', href: '/management/day-report', icon: '📋' },
]

function getTradersByLocation() {
  const traders = getTraders()
  const byLocation = {}
  traders.forEach((t) => {
    const loc = (t.location || '').trim() || 'Unknown'
    byLocation[loc] = (byLocation[loc] || 0) + 1
  })
  const total = traders.length
  const locations = Object.entries(byLocation).sort((a, b) => a[0].localeCompare(b[0]))
  return { total, locations }
}

export default function Management() {
  const [showReportModal, setShowReportModal] = useState(false)
  const { locations } = getTradersByLocation()

  return (
    <main className={layoutStyles.page}>
      <section className={layoutStyles.cards} aria-label="Management overview">
        <button
          type="button"
          className={layoutStyles.card}
          onClick={() => setShowReportModal(true)}
          aria-label="Open Trader DB Report"
        >
          <h2 className={layoutStyles.cardTitle}>Trader DB Report</h2>
          <span className={layoutStyles.cardIcon} aria-hidden>
            📋
          </span>
        </button>
        {actions.map((action) => (
          <Link key={action.href} to={action.href} className={layoutStyles.card}>
            <h2 className={layoutStyles.cardTitle}>{action.title}</h2>
            <span className={layoutStyles.cardIcon} aria-hidden>
              {action.icon}
            </span>
          </Link>
        ))}
      </section>

      {showReportModal && (
        <div
          className={layoutStyles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="trader-db-report-title"
          onClick={() => setShowReportModal(false)}
        >
          <div
            className={layoutStyles.modalPanel}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={layoutStyles.modalHeader}>
              <h2 id="trader-db-report-title" className={layoutStyles.modalTitle}>
                Trader DB Report
              </h2>
              <button
                type="button"
                className={layoutStyles.modalClose}
                onClick={() => setShowReportModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className={layoutStyles.modalBody}>
              <ul className={layoutStyles.summaryList} aria-label="Trader count by destination">
                {locations.map(([loc, count]) => (
                  <li key={loc}>
                    <span className={layoutStyles.summaryLocation}>{loc}</span>
                    <span className={layoutStyles.summaryCount}>{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
