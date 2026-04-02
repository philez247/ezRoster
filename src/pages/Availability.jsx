import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ADMIN_USER_ID, DEVELOPER_USER_ID } from '../data/auth'
import { getTraders } from '../data/traders'
import {
  getRequestsByTraderId,
  createRequest,
  cancelRequest,
  getRequestTypeLabel,
  getRequestStatusLabel,
  REQUEST_TYPES,
} from '../data/availabilityRequests'
import styles from './Availability.module.css'

function traderDisplayName(t) {
  return [t.lastName, t.firstName].filter(Boolean).join(', ') || t.alias || t.traderId
}

function formatDateRange(fromDate, toDate) {
  if (!fromDate) return '-'
  if (!toDate || fromDate === toDate) return fromDate
  return `${fromDate} - ${toDate}`
}

function todayDateStr() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function Availability() {
  const location = useLocation()
  const { activeTraderId } = useAuth()
  const isTraderScoped = !!activeTraderId && activeTraderId !== ADMIN_USER_ID && activeTraderId !== DEVELOPER_USER_ID
  const [traderId, setTraderId] = useState(location.state?.traderId || (isTraderScoped ? activeTraderId : ''))
  const [requests, setRequests] = useState([])
  const [type, setType] = useState('DAY_OFF')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [note, setNote] = useState('')
  const [adding, setAdding] = useState(false)
  const [requestFilter, setRequestFilter] = useState('PENDING')

  const traders = getTraders()

  useEffect(() => {
    const id = location.state?.traderId
    if (id) setTraderId(id)
  }, [location.state?.traderId])

  useEffect(() => {
    if (isTraderScoped && !location.state?.traderId && !traderId && activeTraderId) {
      setTraderId(activeTraderId)
    }
  }, [activeTraderId, isTraderScoped, location.state?.traderId, traderId])

  useEffect(() => {
    if (!traderId) {
      setRequests([])
      return
    }
    setRequests(getRequestsByTraderId(traderId))
  }, [traderId])

  const handleAdd = (e) => {
    e.preventDefault()
    if (!traderId || !fromDate.trim()) return
    const fd = fromDate.trim()
    const td = toDate.trim() || fd
    createRequest(traderId, { type, fromDate: fd, toDate: td, note })
    setRequests(getRequestsByTraderId(traderId))
    setFromDate('')
    setToDate('')
    setNote('')
    setAdding(false)
  }

  const handleCancel = (requestId) => {
    cancelRequest(requestId)
    setRequests(getRequestsByTraderId(traderId))
  }

  const statusClass = (status) => {
    if (status === 'CONFIRMED') return styles.badgeConfirmed
    if (status === 'CANCELLED') return styles.badgeCancelled
    return styles.badgePending
  }

  const today = todayDateStr()
  const filteredRequests = requests.filter((request) => {
    const endDate = (request.toDate || request.fromDate || '').trim()
    const isPast = !!endDate && endDate < today
    if (requestFilter === 'PAST') return isPast
    if (requestFilter === 'PENDING') return !isPast && request.status === 'PENDING'
    if (requestFilter === 'REVIEWED') return !isPast && request.status !== 'PENDING'
    return true
  })

  const emptyMessage =
    requestFilter === 'PAST'
      ? 'No past requests.'
      : requestFilter === 'REVIEWED'
        ? 'No reviewed requests.'
        : 'No pending requests.'

  return (
    <main className={styles.page}>
      <div className={styles.form}>
        {!isTraderScoped && (
          <>
            <label className={styles.label}>Trader</label>
            <select
              value={traderId}
              onChange={(e) => setTraderId(e.target.value)}
              className={styles.traderSelect}
              aria-label="Select trader"
            >
              <option value="">- Select trader -</option>
              {traders.map((t) => (
                <option key={t.traderId} value={t.traderId}>
                  {traderDisplayName(t)}
                </option>
              ))}
            </select>
          </>
        )}

        {traderId && (
          <>
            <div className={styles.section}>
              {!adding ? (
                <button type="button" onClick={() => setAdding(true)} className={styles.addBtn}>
                  Add Request
                </button>
              ) : (
                <form onSubmit={handleAdd} className={styles.addForm}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Type</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className={styles.select}
                    >
                      {REQUEST_TYPES.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.dateRow}>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>From date</label>
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className={styles.dateInput}
                        required
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>To date (optional)</label>
                      <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className={styles.dateInput}
                      />
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Note (optional)</label>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className={styles.textInput}
                      placeholder="Add a note..."
                    />
                  </div>
                  <div className={styles.formActions}>
                    <button type="submit" className={styles.submitBtn}>
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAdding(false)
                        setFromDate('')
                        setToDate('')
                        setNote('')
                      }}
                      className={styles.cancelBtn}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className={styles.section}>
              <div className={styles.filterRow}>
                <button
                  type="button"
                  className={styles.filterBtn}
                  data-active={requestFilter === 'REVIEWED'}
                  onClick={() => setRequestFilter('REVIEWED')}
                >
                  Reviewed
                </button>
                <button
                  type="button"
                  className={styles.filterBtn}
                  data-active={requestFilter === 'PENDING'}
                  onClick={() => setRequestFilter('PENDING')}
                >
                  Pending
                </button>
                <button
                  type="button"
                  className={styles.filterBtn}
                  data-active={requestFilter === 'PAST'}
                  onClick={() => setRequestFilter('PAST')}
                >
                  Past
                </button>
              </div>
              <div className={styles.requestWindow}>
                {filteredRequests.length === 0 ? (
                  <p className={styles.emptyText}>{emptyMessage}</p>
                ) : (
                  <ul className={styles.requestList}>
                    {filteredRequests.map((r) => (
                      <li key={r.id} className={styles.requestItem}>
                        <div className={styles.requestMain}>
                          <span className={styles.requestType}>{getRequestTypeLabel(r.type)}</span>
                          <span className={styles.requestDates}>{formatDateRange(r.fromDate, r.toDate)}</span>
                          <span className={`${styles.badge} ${statusClass(r.status)}`}>
                            {getRequestStatusLabel(r.status)}
                          </span>
                          {r.note && <span className={styles.requestNote}>{r.note}</span>}
                        </div>
                        {r.status === 'PENDING' && requestFilter !== 'PAST' && (
                          <button
                            type="button"
                            onClick={() => handleCancel(r.id)}
                            className={styles.cancelRequestBtn}
                          >
                            Cancel request
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
