import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ADMIN_USER_ID, DEVELOPER_USER_ID } from '../data/auth'
import {
  REQUEST_STATUSES,
  getRequestStatusLabel,
  getRequestTypeLabel,
  updateRequestStatus,
} from '../data/availabilityRequests'
import { loadTraderDb } from '../data/traderDb'
import { getTraderById } from '../data/traders'
import layoutStyles from './Home.module.css'
import styles from './AvailabilityReport.module.css'

const REQUEST_CARDS = [
  { title: 'This Manager', href: '/management/requests?scope=manager' },
  { title: 'This Location', href: '/management/requests?scope=location' },
]

function getManagerContext(activeTraderId) {
  if (!activeTraderId || activeTraderId === ADMIN_USER_ID || activeTraderId === DEVELOPER_USER_ID) {
    return { managerName: '', location: '', isScopedManager: false }
  }
  const trader = getTraderById(activeTraderId)
  if (!trader) return { managerName: '', location: '', isScopedManager: false }
  return {
    managerName: [trader.firstName, trader.lastName].filter(Boolean).join(' ').trim(),
    location: trader.location || '',
    isScopedManager: trader.appUserLevel === 'Manager',
  }
}

function mapRequests() {
  const db = loadTraderDb()
  return Object.values(db.traders)
    .filter((profile) => profile?.bio?.active !== false)
    .flatMap((profile) => {
      const trader = profile?.bio || {}
      const requestsByTrader = Array.isArray(profile?.requests) ? profile.requests : []
      return requestsByTrader.map((request) => ({
        ...request,
        traderName: [trader.lastName, trader.firstName].filter(Boolean).join(', ') || trader.alias || trader.traderId,
        managerName: trader.manager || '',
        location: trader.location || 'Unknown',
      }))
    })
    .sort((a, b) => (b.fromDate || '').localeCompare(a.fromDate || ''))
}

function RequestList({ requests, statusFilter, setStatusFilter, onRefresh, backHref, scopeLabel }) {
  return (
    <main className={styles.page}>
      <div className={styles.filters}>
        <Link to={backHref} className={styles.back}>
          ← Back
        </Link>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className={styles.sportSelect}
          aria-label="Filter requests by status"
        >
          <option value="">All statuses</option>
          {REQUEST_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>{status.label}</option>
          ))}
        </select>
      </div>

      <div className={styles.scrollWrap}>
        <ul className={styles.list} aria-label={`${scopeLabel} requests list`}>
          {requests.map((request) => (
            <li key={request.id}>
              <section className={styles.locationCard} aria-label={`Request ${request.id}`}>
                <div className={styles.locationHeader}>
                  <span className={styles.locationTitle}>{request.traderName}</span>
                  <span className={styles.locationCount}>{getRequestStatusLabel(request.status)}</span>
                </div>
                <div className={styles.statusGroups}>
                  <div className={styles.statusBlock}>
                    <div className={styles.statusHeader}>
                      <span className={styles.statusTitle}>
                        {getRequestTypeLabel(request.type)} · {request.location}
                      </span>
                    </div>
                    <ul className={styles.availabilityTraderList}>
                      <li className={styles.availabilityRow}>
                        <div className={styles.availabilityRowLeft}>
                          <span className={styles.availabilityAlias}>
                            {request.fromDate}
                            {request.toDate && request.toDate !== request.fromDate ? ` to ${request.toDate}` : ''}
                          </span>
                        </div>
                        {request.note ? <span className={styles.availabilityBadgePreference}>{request.note}</span> : null}
                      </li>
                      {request.managerName ? (
                        <li className={styles.availabilityRow}>
                          <div className={styles.availabilityRowLeft}>
                            <span className={styles.availabilityAlias}>Manager</span>
                          </div>
                          <span className={styles.availabilityBadgePreference}>{request.managerName}</span>
                        </li>
                      ) : null}
                      <li className={styles.availabilityRow}>
                        <div className={styles.availabilityRowLeft}>
                          <span className={styles.availabilityAlias}>Update status</span>
                        </div>
                        <select
                          value={request.status}
                          className={styles.sportSelect}
                          onChange={(event) => {
                            updateRequestStatus(request.id, event.target.value)
                            onRefresh()
                          }}
                        >
                          {REQUEST_STATUSES.map((status) => (
                            <option key={status.value} value={status.value}>{status.label}</option>
                          ))}
                        </select>
                      </li>
                    </ul>
                  </div>
                </div>
              </section>
            </li>
          ))}
          {requests.length === 0 && (
            <li className={styles.empty}>No requests match this filter.</li>
          )}
        </ul>
      </div>
    </main>
  )
}

export default function ManagementRequests() {
  const { activeTraderId } = useAuth()
  const [searchParams] = useSearchParams()
  const scope = searchParams.get('scope') || ''
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [revision, setRevision] = useState(0)

  const managerContext = useMemo(() => getManagerContext(activeTraderId), [activeTraderId])
  const requests = useMemo(() => mapRequests(), [revision])

  const scopedRequests = useMemo(() => {
    let next = requests
    if (scope === 'manager') {
      next = managerContext.managerName
        ? next.filter((request) => request.managerName === managerContext.managerName)
        : []
    } else if (scope === 'location') {
      next = managerContext.location
        ? next.filter((request) => request.location === managerContext.location)
        : []
    }
    if (statusFilter) next = next.filter((request) => request.status === statusFilter)
    return next
  }, [managerContext.location, managerContext.managerName, requests, scope, statusFilter])

  if (!scope) {
    return (
      <main className={layoutStyles.page}>
        <section className={layoutStyles.cards} aria-label="Request views">
          {REQUEST_CARDS.map((card) => (
            <Link key={card.href} to={card.href} className={layoutStyles.card}>
              <h2 className={layoutStyles.cardTitle}>{card.title}</h2>
            </Link>
          ))}
        </section>
      </main>
    )
  }

  const scopeLabel = scope === 'manager' ? 'This Manager' : 'This Location'

  return (
    <RequestList
      requests={scopedRequests}
      statusFilter={statusFilter}
      setStatusFilter={setStatusFilter}
      onRefresh={() => setRevision((value) => value + 1)}
      backHref="/management/requests"
      scopeLabel={scopeLabel}
    />
  )
}
