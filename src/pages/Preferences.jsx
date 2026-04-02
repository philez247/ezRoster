import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { ADMIN_USER_ID, DEVELOPER_USER_ID } from '../data/auth'
import { getTraders } from '../data/traders'
import { getConfig } from '../config/store'
import {
  getPreferencesByTraderId,
  getPreferenceRanges,
  getPreferenceDateRange,
  saveAllPreferences,
  addPreferenceRange,
  resetAllPreferencesToNoPreference,
  getPreferenceSummary,
  normalizeShiftTiming,
  preferenceNeedsShiftAndSport,
  DAY_LABELS,
  DAY_INDICES,
  PREFERENCE_OPTIONS,
  SHIFT_TIMING_OPTIONS,
} from '../data/traderPreferences'
import styles from './Preferences.module.css'

function traderDisplayName(t) {
  return [t.lastName, t.firstName].filter(Boolean).join(', ') || t.alias || t.traderId
}

function hasPreferenceSet(preference) {
  return preference && preference !== 'NO_PREFERENCE' && preference !== ''
}

function formatRangeLabel(fromDate, toDate) {
  if (fromDate || toDate) return `From ${fromDate || '-'} to ${toDate || '-'}`
  return 'No date range set'
}

function DateField({ id, value, onChange, placeholder, ariaLabel }) {
  const inputRef = useRef(null)

  const openPicker = () => {
    const input = inputRef.current
    if (!input) return
    if (typeof input.showPicker === 'function') input.showPicker()
    else input.focus()
  }

  return (
    <div className={styles.dateField} onClick={openPicker} role="presentation">
      <input
        ref={inputRef}
        id={id}
        type="date"
        value={value}
        onChange={onChange}
        className={styles.dateInput}
        data-empty={!value}
        aria-label={ariaLabel}
      />
      {!value && <span className={styles.datePlaceholder}>{placeholder}</span>}
    </div>
  )
}

export default function Preferences() {
  const { activeTraderId } = useAuth()
  const isTraderScoped = !!activeTraderId && activeTraderId !== ADMIN_USER_ID && activeTraderId !== DEVELOPER_USER_ID
  const [traderId, setTraderId] = useState(isTraderScoped ? activeTraderId : '')
  const [config, setConfig] = useState(() => getConfig())
  const [ranges, setRanges] = useState([])
  const [view, setView] = useState('ranges')
  const [selectedRangeId, setSelectedRangeId] = useState(null)
  const [prefs, setPrefs] = useState([])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [saved, setSaved] = useState(false)
  const [openDayIndex, setOpenDayIndex] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [resetMessage, setResetMessage] = useState('')

  const traders = getTraders()

  useEffect(() => {
    setConfig(getConfig())
  }, [])

  useEffect(() => {
    if (isTraderScoped && !traderId && activeTraderId) setTraderId(activeTraderId)
  }, [activeTraderId, isTraderScoped, traderId])

  useEffect(() => {
    if (!traderId) {
      setRanges([])
      setView('ranges')
      setSelectedRangeId(null)
      setPrefs([])
      setFromDate('')
      setToDate('')
      setOpenDayIndex(null)
      setEditMode(false)
      return
    }
    const rangeList = getPreferenceRanges(traderId)
    setRanges(rangeList)
    setView('ranges')
    setSelectedRangeId(null)
    if (rangeList.length === 0) {
      setPrefs(DAY_INDICES.map((d) => ({ dayIndex: d, preference: 'NO_PREFERENCE', sport: '', shiftTiming: '' })))
      setFromDate('')
      setToDate('')
    }
    setOpenDayIndex(null)
    setEditMode(false)
  }, [traderId])

  useEffect(() => {
    if (!traderId) return
    if (selectedRangeId) {
      setPrefs(getPreferencesByTraderId(traderId, selectedRangeId))
      const range = getPreferenceDateRange(traderId, selectedRangeId)
      setFromDate(range.fromDate || '')
      setToDate(range.toDate || '')
    }
  }, [traderId, selectedRangeId])

  const updateDay = (dayIndex, updates) => {
    setPrefs((prev) => {
      const next = [...(prev.length ? prev : DAY_INDICES.map((d) => ({ dayIndex: d, preference: 'NO_PREFERENCE', sport: '', shiftTiming: '' })))]
      const idx = next.findIndex((p) => p.dayIndex === dayIndex)
      if (idx >= 0) next[idx] = { ...next[idx], ...updates }
      else next[dayIndex] = { dayIndex, preference: 'NO_PREFERENCE', sport: '', shiftTiming: '', ...updates }
      return next
    })
    setSaved(false)
  }

  const handleSave = (e) => {
    e.preventDefault()
    if (!traderId || !selectedRangeId) return
    const list = prefs.length ? prefs : DAY_INDICES.map((d) => ({ dayIndex: d, preference: 'NO_PREFERENCE', sport: '', shiftTiming: '' }))
    saveAllPreferences(traderId, list, { fromDate, toDate }, selectedRangeId)
    setRanges(getPreferenceRanges(traderId))
    setPrefs(getPreferencesByTraderId(traderId, selectedRangeId))
    const range = getPreferenceDateRange(traderId, selectedRangeId)
    setFromDate(range.fromDate || '')
    setToDate(range.toDate || '')
    setSaved(true)
  }

  const handleAddDateRange = () => {
    if (!traderId) return
    const newRangeId = addPreferenceRange(traderId, '', '')
    setRanges(getPreferenceRanges(traderId))
    setSelectedRangeId(newRangeId)
    setView('range-detail')
    setPrefs(getPreferencesByTraderId(traderId, newRangeId))
    setFromDate('')
    setToDate('')
    setEditMode(true)
  }

  const openRangeDetail = (rangeId) => {
    setSelectedRangeId(rangeId)
    setView('range-detail')
  }

  const handleResetAllToNoPreference = () => {
    resetAllPreferencesToNoPreference()
    if (traderId) {
      const rangeList = getPreferenceRanges(traderId)
      setRanges(rangeList)
      if (selectedRangeId) setPrefs(getPreferencesByTraderId(traderId, selectedRangeId))
    }
    setResetMessage('All traders preferences set to No Preference.')
    setTimeout(() => setResetMessage(''), 4000)
  }

  const rows = prefs.length ? prefs : DAY_INDICES.map((d) => ({ dayIndex: d, preference: 'NO_PREFERENCE', sport: '', shiftTiming: '' }))
  const toggleDay = (dayIndex) => setOpenDayIndex((current) => (current === dayIndex ? null : dayIndex))
  const selectedRange = ranges.find((r) => r.rangeId === selectedRangeId)
  const handleCancelEdit = () => {
    if (traderId && selectedRangeId) {
      setPrefs(getPreferencesByTraderId(traderId, selectedRangeId))
      const range = getPreferenceDateRange(traderId, selectedRangeId)
      setFromDate(range.fromDate || '')
      setToDate(range.toDate || '')
    }
    setSaved(false)
    setOpenDayIndex(null)
    setEditMode(false)
  }

  return (
    <main className={styles.page}>
      <form onSubmit={handleSave} className={styles.form}>
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

        {!isTraderScoped && (
          <div className={styles.resetAllRow}>
            <button
              type="button"
              onClick={handleResetAllToNoPreference}
              className={styles.resetAllBtn}
            >
              Reset all traders preferences to No Preference
            </button>
            {resetMessage && <span className={styles.resetMessage}>{resetMessage}</span>}
          </div>
        )}

        {traderId && (
          <>
            {view === 'ranges' ? (
              <div className={styles.rangeCardsSection}>
                <p className={styles.rangeCardsIntro}>Select a date range to view or edit preferences.</p>
                {ranges.length === 0 ? (
                  <div className={styles.rangeCardsEmpty}>
                    <p className={styles.rangeCardsEmptyText}>No date ranges yet.</p>
                    <button type="button" onClick={handleAddDateRange} className={styles.addRangeBtn}>
                      Add date range
                    </button>
                  </div>
                ) : (
                  <ul className={styles.rangeCardList} aria-label="Date ranges">
                    {ranges.map((r) => (
                      <li key={r.rangeId} className={styles.rangeCardItem}>
                        <button
                          type="button"
                          className={styles.rangeCard}
                          onClick={() => openRangeDetail(r.rangeId)}
                          aria-label={`View preferences for ${formatRangeLabel(r.fromDate, r.toDate)}`}
                        >
                          <span className={styles.rangeCardLabel}>{formatRangeLabel(r.fromDate, r.toDate)}</span>
                          <span className={styles.rangeCardChevron} aria-hidden>{'>'}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {ranges.length > 0 && (
                  <button type="button" onClick={handleAddDateRange} className={styles.addRangeBtn}>
                    Add date range
                  </button>
                )}
              </div>
            ) : view === 'range-detail' && !editMode ? (
              <>
                <div className={styles.viewSummary} aria-label="Preferences summary">
                  <div className={styles.viewDateRangeField}>
                    <span className={styles.viewDateRangeLabel}>Date range</span>
                    <div className={styles.viewDateRangeValue}>
                      {formatRangeLabel(selectedRange?.fromDate, selectedRange?.toDate)}
                    </div>
                  </div>

                  <ul className={styles.viewDayList}>
                    {rows.map((row, i) => {
                      const dayIndex = row.dayIndex ?? i
                      return (
                        <li key={dayIndex} className={styles.viewDayRow}>
                          <span className={styles.viewDayName}>{DAY_LABELS[dayIndex]}</span>
                          <span className={styles.viewDayDetail}>{getPreferenceSummary(row)}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
                <button type="button" onClick={() => setEditMode(true)} className={styles.editPrefBtn}>
                  Edit preferences
                </button>
              </>
            ) : view === 'range-detail' && editMode ? (
              <>
                <div className={styles.dateRow}>
                  <div className={styles.field}>
                    <DateField
                      id="pref-from"
                      value={fromDate}
                      onChange={(e) => {
                        setFromDate(e.target.value)
                        setSaved(false)
                      }}
                      placeholder="From"
                      ariaLabel="Valid from date"
                    />
                  </div>
                  <div className={styles.field}>
                    <DateField
                      id="pref-to"
                      value={toDate}
                      onChange={(e) => {
                        setToDate(e.target.value)
                        setSaved(false)
                      }}
                      placeholder="To"
                      ariaLabel="Valid to date"
                    />
                  </div>
                </div>

                {ranges.length > 1 && (
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Date range</label>
                    <select
                      value={selectedRangeId || ''}
                      onChange={(e) => setSelectedRangeId(e.target.value)}
                      className={styles.rangeSelect}
                      aria-label="Select date range to edit"
                    >
                      {ranges.map((r) => (
                        <option key={r.rangeId} value={r.rangeId}>
                          {formatRangeLabel(r.fromDate, r.toDate)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <ul className={styles.cardList} aria-label="Daily preferences">
                  {rows.map((row, i) => {
                    const dayIndex = row.dayIndex ?? i
                    const dayLabel = DAY_LABELS[dayIndex]
                    const preference = row.preference || 'NO_PREFERENCE'
                    const hasPreference = hasPreferenceSet(preference)
                    const isOpen = openDayIndex === dayIndex
                    const needsDetails = preferenceNeedsShiftAndSport(preference)
                    return (
                      <li key={dayIndex} className={styles.cardItem}>
                        <div className={styles.card}>
                          <button
                            type="button"
                            className={styles.cardHeader}
                            onClick={() => toggleDay(dayIndex)}
                            aria-expanded={isOpen}
                            aria-controls={`pref-panel-${dayIndex}`}
                            id={`pref-heading-${dayIndex}`}
                          >
                            <span className={styles.cardDay}>{dayLabel}</span>
                            <span className={hasPreference ? styles.badgePreference : styles.badgeNoPreference}>
                              {hasPreference ? 'Preference' : 'No Preference'}
                            </span>
                            <span className={styles.cardChevron} aria-hidden data-open={isOpen}>v</span>
                          </button>
                          <div
                            id={`pref-panel-${dayIndex}`}
                            role="region"
                            className={styles.cardPanel}
                            data-open={isOpen}
                            aria-hidden={!isOpen}
                            aria-labelledby={`pref-heading-${dayIndex}`}
                          >
                            <div className={styles.cardBody}>
                              <div className={styles.field}>
                                <select
                                  value={preference}
                                  onChange={(e) =>
                                    updateDay(dayIndex, {
                                      preference: e.target.value,
                                      sport: preferenceNeedsShiftAndSport(e.target.value) ? row.sport : '',
                                      shiftTiming: preferenceNeedsShiftAndSport(e.target.value)
                                        ? normalizeShiftTiming(row.shiftTiming)
                                        : '',
                                    })
                                  }
                                  className={styles.select}
                                  aria-label={`${dayLabel} preference`}
                                >
                                  {PREFERENCE_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div className={styles.field}>
                                <select
                                  value={needsDetails ? normalizeShiftTiming(row.shiftTiming) : ''}
                                  onChange={(e) => updateDay(dayIndex, { shiftTiming: e.target.value })}
                                  className={styles.select}
                                  aria-label={`${dayLabel} shift`}
                                  disabled={!needsDetails}
                                >
                                  <option value="">Shift</option>
                                  {SHIFT_TIMING_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div className={styles.field}>
                                <select
                                  value={needsDetails ? (row.sport || '') : ''}
                                  onChange={(e) => updateDay(dayIndex, { sport: e.target.value })}
                                  className={styles.select}
                                  aria-label={`${dayLabel} sport`}
                                  disabled={!needsDetails}
                                >
                                  <option value="">Sport</option>
                                  {config.sports.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>

                <div className={styles.actions}>
                  <button type="submit" className={styles.saveBtn}>
                    Save
                  </button>
                  <button type="button" onClick={handleCancelEdit} className={styles.donePrefBtn}>
                    Cancel
                  </button>
                  {saved && <span className={styles.saved}>Saved.</span>}
                </div>
              </>
            ) : null}
          </>
        )}
      </form>
    </main>
  )
}
