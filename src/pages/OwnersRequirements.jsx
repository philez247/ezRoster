import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  addRequestedTrader,
  removeRequestedTrader,
  setOwnerDailyRequirement,
} from '../data/ownerDailyRequirements'
import { formatFullDateEt, getIsoWeek } from '../domain/calendar'
import {
  AVAILABILITY_STATUS_LABELS,
  AVAILABILITY_STATUS_ORDER,
  DEMAND_LEVELS,
  OFFICE_LOCATIONS,
  SPORT_OPTIONS,
} from '../domain/constants/preAllocation'
import { buildOwnersRequirementsState } from '../domain/requirements/selectors'
import layoutStyles from './Home.module.css'
import styles from './OwnersResources.module.css'

function buildParams(searchParams, overrides = {}) {
  const next = new URLSearchParams(searchParams)
  Object.entries(overrides).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') next.delete(key)
    else next.set(key, String(value))
  })
  return next
}

function AvailabilityStatusCards({ counts, onOpen }) {
  return (
    <>
      {AVAILABILITY_STATUS_ORDER.map((status) => (
        <button
          key={status}
          type="button"
          className={styles.requirementsToggle}
          onClick={() => onOpen(status)}
        >
          <span>{AVAILABILITY_STATUS_LABELS[status]}</span>
          <span>{counts[status] || 0} traders</span>
        </button>
      ))}
    </>
  )
}

function SectionReturnCard({ title, onClick }) {
  return (
    <button type="button" className={styles.requirementsToggle} onClick={onClick}>
      <span>{title}</span>
      <span className={styles.requirementsChevron} aria-hidden>{'>'}</span>
    </button>
  )
}

function RequirementsHeader({ dateLabel, location, sportFilter, onSportChange, onBack }) {
  return (
    <div className={styles.dayDetailHeaderStack}>
      <div className={styles.dayDetailHeaderField}>
        <div className={styles.dayDetailHeaderRow1}>{dateLabel}</div>
        <div className={styles.dayDetailHeaderMeta}>{location}</div>
      </div>
      <div className={styles.dayDetailControlRow}>
        <select
          className={`${styles.filterSelect} ${styles.dayDetailFilterSelect} ${styles.dayDetailControlSelect}`}
          value={sportFilter}
          onChange={onSportChange}
        >
          <option value="">Sport</option>
          {SPORT_OPTIONS.filter(Boolean).map((sport) => (
            <option key={sport} value={sport}>{sport}</option>
          ))}
        </select>
        <button type="button" className={`${styles.backBtn} ${styles.dayDetailControlButton}`} onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  )
}

function formatConfirmedAt(value) {
  if (!value) return 'Not submitted'
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(value))
  } catch {
    return 'Submitted'
  }
}

export default function OwnersRequirements() {
  const currentYear = new Date().getFullYear()
  const currentWeek = getIsoWeek(new Date())
  const [searchParams, setSearchParams] = useSearchParams()
  const page = searchParams.get('page') || 'week'
  const selectedDay = searchParams.get('date') || ''
  const selectedStatus = searchParams.get('status') || ''
  const sportFilter = searchParams.get('sport') || ''
  const [year, setYear] = useState(() => Number(searchParams.get('year')) || currentYear)
  const [week, setWeek] = useState(() => searchParams.get('week') || '')
  const [location, setLocation] = useState(() => searchParams.get('location') || '')
  const [requestTraderId, setRequestTraderId] = useState('')
  const [revision, setRevision] = useState(0)

  const viewState = useMemo(() => buildOwnersRequirementsState({
    year,
    week,
    location,
    selectedDay,
    sportFilter,
  }), [location, revision, selectedDay, sportFilter, week, year])

  const {
    weekStatus,
    daySummaries,
    activeSport,
    dailyRequirement,
    availabilityRows,
    availabilityCounts,
    requestableTraders,
    requestedTraders,
    selectedDaySummary,
  } = viewState

  const availabilityList = useMemo(() => (
    availabilityRows.filter((row) => row.status === selectedStatus)
  ), [availabilityRows, selectedStatus])

  const updatePage = (overrides) => {
    setSearchParams(buildParams(searchParams, overrides))
  }

  const touchRequirement = (updates) => {
    if (!selectedDay || !location || !activeSport) return
    setOwnerDailyRequirement(selectedDay, location, activeSport, {
      ...updates,
      confirmedAt: '',
    })
    setRevision((value) => value + 1)
  }

  const handleRequestTraderAdd = () => {
    if (!requestTraderId || !selectedDay || !location || !activeSport) return
    addRequestedTrader(selectedDay, location, activeSport, requestTraderId)
    setOwnerDailyRequirement(selectedDay, location, activeSport, { confirmedAt: '' })
    setRevision((value) => value + 1)
    setRequestTraderId('')
  }

  const handleRequestTraderRemove = (traderId) => {
    if (!selectedDay || !location || !activeSport) return
    removeRequestedTrader(selectedDay, location, activeSport, traderId)
    setOwnerDailyRequirement(selectedDay, location, activeSport, { confirmedAt: '' })
    setRevision((value) => value + 1)
  }

  const handleSubmitRequirements = () => {
    if (!selectedDay || !location || !activeSport) return
    setOwnerDailyRequirement(selectedDay, location, activeSport, {
      confirmedAt: new Date().toISOString(),
    })
    setRevision((value) => value + 1)
  }

  const handleWeekView = () => {
    if (!week || !location) return
    setSearchParams(buildParams(searchParams, {
      year,
      week,
      location,
      page: 'week',
      date: null,
      sport: null,
      status: null,
    }))
  }

  if (page === 'week') {
    return (
      <main className={`${layoutStyles.page} ${styles.resourcesPage}`}>
        <section className={styles.resourcesContent}>
          <div className={styles.requirementsWeekHeader}>
            <div className={styles.dayDetailHeaderField}>
              <div className={styles.dayDetailHeaderRow1}>Requirements</div>
            </div>
          </div>
          <div className={styles.filterBar}>
            <div className={`${styles.filterGrid} ${styles.requirementsFilterGrid}`}>
              <label className={styles.filterGroup}>
                <span className={styles.label}>Year</span>
                <select className={styles.filterSelect} value={year} onChange={(event) => setYear(Number(event.target.value))}>
                  {Array.from({ length: 4 }, (_, index) => currentYear - 1 + index).map((optionYear) => (
                    <option key={optionYear} value={optionYear}>{optionYear}</option>
                  ))}
                </select>
              </label>
              <label className={styles.filterGroup}>
                <span className={styles.label}>Week</span>
                <select className={styles.filterSelect} value={week} onChange={(event) => setWeek(event.target.value)}>
                  <option value="">Select week</option>
                  {Array.from({ length: 53 }, (_, index) => index + 1).map((optionWeek) => (
                    <option key={optionWeek} value={optionWeek}>Week {optionWeek}</option>
                  ))}
                </select>
              </label>
              <label className={styles.filterGroup}>
                <span className={styles.label}>Location</span>
                <select className={styles.filterSelect} value={location} onChange={(event) => setLocation(event.target.value)}>
                  <option value="">Select location</option>
                  {OFFICE_LOCATIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className={`${styles.viewWeekBtns} ${styles.requirementsViewBtnWrap}`}>
              <button type="button" className={styles.viewWeekBtn} onClick={handleWeekView} disabled={!week || !location}>
                View
              </button>
              <Link
                to={`/management/pre-allocation-audit?year=${year}&week=${week || ''}&office=${location || ''}`}
                className={styles.viewWeekBtn}
                aria-disabled={!week || !location}
                onClick={(event) => {
                  if (!week || !location) event.preventDefault()
                }}
              >
                Audit
              </Link>
            </div>
          </div>

          {week && location && (
            <div className={styles.dayCardList}>
              {daySummaries.map((day) => (
                <button
                  key={day.dateStr}
                  type="button"
                  className={styles.dayCard}
                  onClick={() => updatePage({ date: day.dateStr, page: 'day', sport: day.sports[0]?.sport || '', status: null })}
                >
                  <div className={styles.dayCardMain}>
                    <div className={styles.dayCardTopRow}>
                      <span className={styles.dayLabel}>{day.label}</span>
                      <span className={styles.chevron} aria-hidden>{'>'}</span>
                    </div>
                    <div className={styles.dayCardBottomRow}>
                      <span className={styles.dayMetaLeft}>Games: {day.totalGames}</span>
                      <span className={styles.dayMetaRight}>Submitted: {day.submittedSports}/{day.sports.length}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    )
  }

  if (page === 'availability') {
    return (
      <main className={`${layoutStyles.page} ${styles.dayDetailPage}`}>
        <RequirementsHeader
          dateLabel={formatFullDateEt(selectedDay)}
          location={location}
          sportFilter={activeSport}
          onSportChange={(event) => updatePage({ sport: event.target.value })}
          onBack={() => updatePage({ page: 'day', status: null })}
        />

        <section className={styles.dayDetailContent}>
          <SectionReturnCard title="Availability" onClick={() => updatePage({ page: 'day', status: null })} />
          <div className={styles.requirementsPanel}>
            <div className={styles.requirementsRow}>
              <span className={styles.requirementsLabel}>Request Trader</span>
              <div className={styles.requestTraderEntry}>
                <select className={styles.requirementsSelect} value={requestTraderId} onChange={(event) => setRequestTraderId(event.target.value)}>
                  <option value="">Select trader...</option>
                  {requestableTraders.map((trader) => (
                    <option key={trader.traderId} value={trader.traderId}>
                      {[trader.bio.lastName, trader.bio.firstName].filter(Boolean).join(', ')}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={styles.requestTraderAddBtn}
                  disabled={!requestTraderId}
                  onClick={handleRequestTraderAdd}
                >
                  Add
                </button>
              </div>
            </div>

            {requestedTraders.length > 0 && (
              <div className={styles.requestedTradersList}>
                {requestedTraders.map((trader) => (
                  <span key={trader.traderId} className={styles.requestedTraderChip}>
                    {[trader.bio.lastName, trader.bio.firstName].filter(Boolean).join(', ')}
                    <button
                      type="button"
                      className={styles.chipRemove}
                      onClick={() => {
                        handleRequestTraderRemove(trader.traderId)
                        updatePage({ page: 'availability' })
                      }}
                      aria-label={`Remove ${trader.bio.firstName} ${trader.bio.lastName}`}
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {!selectedStatus && (
            <AvailabilityStatusCards counts={availabilityCounts} onOpen={(status) => updatePage({ status })} />
          )}

          {selectedStatus && (
            <div className={styles.requirementsPanel}>
              <div className={styles.availabilitySummary}>{AVAILABILITY_STATUS_LABELS[selectedStatus]}: {availabilityList.length} traders</div>
              <ul className={styles.availabilityTraderList}>
                {availabilityList.map((row) => (
                  <li key={row.traderId} className={styles.availabilityRow}>
                    <div className={styles.availabilityRowLeft}>
                      <span className={styles.availabilityName}>{row.name}</span>
                      {row.alias && <span className={styles.availabilityAlias}>{row.alias}</span>}
                    </div>
                    {row.source === 'PREFERENCE' && <span className={styles.availabilityBadgePreference}>Preference</span>}
                  </li>
                ))}
                {availabilityList.length === 0 && <li className={styles.empty}>No traders in this status.</li>}
              </ul>
            </div>
          )}
        </section>
      </main>
    )
  }

  if (page === 'report') {
    const ready = selectedDaySummary.assignedGames > 0
    return (
      <main className={`${layoutStyles.page} ${styles.dayDetailPage}`}>
        <RequirementsHeader
          dateLabel={formatFullDateEt(selectedDay)}
          location={location}
          sportFilter={activeSport}
          onSportChange={(event) => updatePage({ sport: event.target.value })}
          onBack={() => updatePage({ page: 'day' })}
        />

        <section className={styles.dayDetailContent}>
          <SectionReturnCard title="Report" onClick={() => updatePage({ page: 'day', status: null })} />
          <div className={styles.requirementsPanel}>
            <div className={styles.requirementsRow}>
              <span className={styles.requirementsLabel}>Traders Needed</span>
              <input
                className={styles.requirementsInput}
                type="number"
                min="0"
                value={dailyRequirement.tradersNeeded}
                onChange={(event) => {
                  touchRequirement({ tradersNeeded: Number(event.target.value) || 0 })
                }}
              />
            </div>
            <div className={styles.requirementsRow}>
              <span className={styles.requirementsLabel}>Demand Level</span>
              <select
                className={styles.requirementsSelect}
                value={dailyRequirement.demandLevel}
                onChange={(event) => {
                  touchRequirement({ demandLevel: event.target.value })
                }}
              >
                {DEMAND_LEVELS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
            <div className={styles.reportSummary}>
              <div className={styles.reportRow}>
                <span>Total games</span>
                <strong>{selectedDaySummary.totalGames}</strong>
              </div>
              <div className={styles.reportRow}>
                <span>Assigned to {location}</span>
                <strong>{selectedDaySummary.assignedGames}</strong>
              </div>
              <div className={styles.reportRow}>
                <span>Requested traders</span>
                <strong>{dailyRequirement.requestedTraderIds.length}</strong>
              </div>
              <div className={styles.reportRow}>
                <span>Ready to send off</span>
                <strong>{ready ? 'Yes' : 'Not yet'}</strong>
              </div>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className={`${layoutStyles.page} ${styles.dayDetailPage}`}>
      <RequirementsHeader
        dateLabel={formatFullDateEt(selectedDay)}
        location={location}
        sportFilter={activeSport}
        onSportChange={(event) => updatePage({ sport: event.target.value })}
        onBack={() => updatePage({ page: 'week', date: null, status: null })}
      />

      <section className={styles.dayDetailContent}>
        <div className={styles.requirementsPanel}>
          <div className={styles.reportSummary}>
            <div className={styles.reportRow}>
              <span>Games</span>
              <strong>{selectedDaySummary.totalGames}</strong>
            </div>
            <div className={styles.reportRow}>
              <span>Assigned to {location}</span>
              <strong>{selectedDaySummary.assignedGames}</strong>
            </div>
          </div>

          <div className={styles.requirementsRow}>
            <span className={styles.requirementsLabel}>Traders Needed</span>
            <input
              className={styles.requirementsInput}
              type="number"
              min="0"
              value={dailyRequirement.tradersNeeded}
              onChange={(event) => {
                touchRequirement({ tradersNeeded: Number(event.target.value) || 0 })
              }}
            />
          </div>

          <div className={styles.requirementsRow}>
            <span className={styles.requirementsLabel}>Request Trader</span>
            <div className={styles.requestTraderEntry}>
              <select className={styles.requirementsSelect} value={requestTraderId} onChange={(event) => setRequestTraderId(event.target.value)}>
                <option value="">Select trader...</option>
                {requestableTraders.map((trader) => (
                  <option key={trader.traderId} value={trader.traderId}>
                    {[trader.bio.lastName, trader.bio.firstName].filter(Boolean).join(', ')}
                  </option>
                ))}
              </select>
              <button type="button" className={styles.requestTraderAddBtn} disabled={!requestTraderId} onClick={handleRequestTraderAdd}>
                Add
              </button>
            </div>
          </div>

          {requestedTraders.length > 0 && (
            <div className={styles.requestedTradersList}>
              {requestedTraders.map((trader) => (
                <span key={trader.traderId} className={styles.requestedTraderChip}>
                  {[trader.bio.lastName, trader.bio.firstName].filter(Boolean).join(', ')}
                  <button
                    type="button"
                    className={styles.chipRemove}
                    onClick={() => {
                      handleRequestTraderRemove(trader.traderId)
                    }}
                    aria-label={`Remove ${trader.bio.firstName} ${trader.bio.lastName}`}
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className={styles.requirementsRow}>
            <span className={styles.requirementsLabel}>Demand Level</span>
            <select
              className={styles.requirementsSelect}
              value={dailyRequirement.demandLevel}
              onChange={(event) => {
                touchRequirement({ demandLevel: event.target.value })
              }}
            >
              {DEMAND_LEVELS.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>

          <div className={styles.reportSummary}>
            <div className={styles.reportRow}>
              <span>Status</span>
              <strong>{formatConfirmedAt(dailyRequirement.confirmedAt)}</strong>
            </div>
          </div>

          <button type="button" className={styles.viewSummarySubmitBtn} onClick={handleSubmitRequirements}>
            Confirm / Submit
          </button>
        </div>

        <button type="button" className={styles.requirementsToggle} onClick={() => updatePage({ page: 'availability', status: null })}>
          <span>Availability</span>
          <span className={styles.requirementsChevron} aria-hidden>{'>'}</span>
        </button>
      </section>
    </main>
  )
}
