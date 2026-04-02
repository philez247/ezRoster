import { useAuth } from '../contexts/AuthContext'
import { ADMIN_USER_ID, DEVELOPER_USER_ID } from '../data/auth'
import {
  getRequestsByTraderId,
  getRequestTypeLabel,
} from '../data/availabilityRequests'
import {
  DAY_LABELS,
  getPreferenceSummary,
  getPreferenceDateRange,
  getPreferencesByTraderId,
} from '../data/traderPreferences'
import styles from './MyAvailability.module.css'

function formatRange(fromDate, toDate) {
  if (!fromDate && !toDate) return 'No date range'
  return `${fromDate || '-'} to ${toDate || '-'}`
}

function formatRequestRange(fromDate, toDate) {
  if (!fromDate) return '-'
  if (!toDate || fromDate === toDate) return fromDate
  return `${fromDate} to ${toDate}`
}

export default function MyAvailability() {
  const { activeTraderId } = useAuth()
  const traderId = activeTraderId && activeTraderId !== ADMIN_USER_ID && activeTraderId !== DEVELOPER_USER_ID ? activeTraderId : ''

  if (!traderId) {
    return (
      <main className={styles.page}>
        <section className={styles.section}>
          <p className={styles.empty}>No active trader.</p>
        </section>
      </main>
    )
  }

  const prefs = getPreferencesByTraderId(traderId).filter((row) => row.preference !== 'NO_PREFERENCE')
  const prefRange = getPreferenceDateRange(traderId)
  const confirmedRequests = getRequestsByTraderId(traderId).filter((request) => request.status === 'CONFIRMED')

  return (
    <main className={styles.page}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Preferences</h2>
        <p className={styles.sectionMeta}>{formatRange(prefRange.fromDate, prefRange.toDate)}</p>
        {prefs.length === 0 ? (
          <p className={styles.empty}>No saved preferences.</p>
        ) : (
          <ul className={styles.list}>
            {prefs.map((row) => (
              <li key={row.dayIndex} className={styles.item}>
                <span className={styles.itemTitle}>{DAY_LABELS[row.dayIndex]}</span>
                <span className={styles.itemMeta}>{getPreferenceSummary(row)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Requests</h2>
        {confirmedRequests.length === 0 ? (
          <p className={styles.empty}>No approved requests.</p>
        ) : (
          <ul className={styles.list}>
            {confirmedRequests.map((request) => (
              <li key={request.id} className={styles.item}>
                <span className={styles.itemTitle}>{getRequestTypeLabel(request.type)}</span>
                <span className={styles.itemMeta}>{formatRequestRange(request.fromDate, request.toDate)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
