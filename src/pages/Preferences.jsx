import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getTraders } from '../data/traders'
import { getConfig } from '../config/store'
import {
  getPreferencesByTraderId,
  getPreferenceRanges,
  getPreferenceDateRange,
  saveAllPreferences,
  addPreferenceRange,
  resetAllPreferencesToNoPreference,
  getPreferenceLabel,
  getShiftTimingLabel,
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
  if (fromDate || toDate) return `From ${fromDate || '—'} to ${toDate || '—'}`
  return 'No date range set'
}

export default function Preferences() {
  const [traderId, setTraderId] = useState('')
  const [config, setConfig] = useState(() => getConfig())
  const [ranges, setRanges] = useState([])
  const [view, setView] = useState('ranges') // 'ranges' = list of date range cards, 'range-detail' = one range's preferences
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
      setPrefs(DAY_INDICES.map((d) => ({ dayIndex: d, preference: 'NO_PREFERENCE', sport: '', shiftTiming: 'FULL' })))
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
      const next = [...(prev.length ? prev : DAY_INDICES.map((d) => ({ dayIndex: d, preference: 'NO_PREFERENCE', sport: '', shiftTiming: 'FULL' })))]
      const idx = next.findIndex((p) => p.dayIndex === dayIndex)
      if (idx >= 0) {
        next[idx] = { ...next[idx], ...updates }
      } else {
        next[dayIndex] = { dayIndex, preference: 'NO_PREFERENCE', sport: '', shiftTiming: 'FULL', ...updates }
      }
      return next
    })
    setSaved(false)
  }

  const handleSave = (e) => {
    e.preventDefault()
    if (!traderId || !selectedRangeId) return
    const list = prefs.length ? prefs : DAY_INDICES.map((d) => ({ dayIndex: d, preference: 'NO_PREFERENCE', sport: '', shiftTiming: 'FULL' }))
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
      if (selectedRangeId) {
        setPrefs(getPreferencesByTraderId(traderId, selectedRangeId))
      }
    }
    setResetMessage('All traders’ preferences set to No Preference.')
    setTimeout(() => setResetMessage(''), 4000)
  }

  const rows = prefs.length ? prefs : DAY_INDICES.map((d) => ({ dayIndex: d, preference: 'NO_PREFERENCE', sport: '', shiftTiming: 'FULL' }))

  const needsSportAndShift = (preference) => preference === 'ON' || preference === 'PREFERRED_ON'

  const toggleDay = (dayIndex) => {
    setOpenDayIndex((current) => (current === dayIndex ? null : dayIndex))
  }

  const selectedRange = ranges.find((r) => r.rangeId === selectedRangeId)

  return (
    <main className={styles.page}>
      <Link to="/traders" className={styles.back}>
        ← Trader Database
      </Link>

      <form onSubmit={handleSave} className={styles.form}>
        <label className={styles.label}>Trader</label>
        <select
          value={traderId}
          onChange={(e) => setTraderId(e.target.value)}
          className={styles.traderSelect}
          aria-label="Select trader"
        >
          <option value="">— Select trader —</option>
          {traders.map((t) => (
            <option key={t.traderId} value={t.traderId}>
              {traderDisplayName(t)}
            </option>
          ))}
        </select>

        <div className={styles.resetAllRow}>
          <button
            type="button"
            onClick={handleResetAllToNoPreference}
            className={styles.resetAllBtn}
          >
            Reset all traders’ preferences to No Preference
          </button>
          {resetMessage && <span className={styles.resetMessage}>{resetMessage}</span>}
        </div>

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
                          <span className={styles.rangeCardChevron} aria-hidden>→</span>
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
                <button
                  type="button"
                  onClick={() => setView('ranges')}
                  className={styles.backToRanges}
                >
                  ← Date ranges
                </button>
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
                      const pref = row.preference || 'NO_PREFERENCE'
                      const label = getPreferenceLabel(pref)
                      const isNoPref = pref === 'NO_PREFERENCE' || !pref
                      const detail = isNoPref
                        ? null
                        : (pref === 'ON' || pref === 'PREFERRED_ON') && row.sport
                          ? `${row.sport} · ${getShiftTimingLabel(row.shiftTiming)}`
                          : getShiftTimingLabel(row.shiftTiming)
                      return (
                        <li key={dayIndex} className={styles.viewDayRow}>
                          <span className={styles.viewDayName}>{DAY_LABELS[dayIndex]}</span>
                          <span className={styles.viewDayDetail}>
                            {isNoPref ? label : `${label} – ${detail}`}
                          </span>
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
                <button
                  type="button"
                  onClick={() => setView('ranges')}
                  className={styles.backToRanges}
                >
                  ← Date ranges
                </button>
                <div className={styles.dateRow}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="pref-from">From</label>
                    <input
                      id="pref-from"
                      type="date"
                      value={fromDate}
                      onChange={(e) => {
                        setFromDate(e.target.value)
                        setSaved(false)
                      }}
                      className={styles.dateInput}
                      aria-label="Valid from date"
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="pref-to">To</label>
                    <input
                      id="pref-to"
                      type="date"
                      value={toDate}
                      onChange={(e) => {
                        setToDate(e.target.value)
                        setSaved(false)
                      }}
                      className={styles.dateInput}
                      aria-label="Valid to date"
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
                            <span className={styles.cardChevron} aria-hidden data-open={isOpen}>▼</span>
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
                                <label className={styles.fieldLabel}>Preference</label>
                                <select
                                  value={preference}
                                  onChange={(e) =>
                                    updateDay(dayIndex, {
                                      preference: e.target.value,
                                      sport: needsSportAndShift(e.target.value) ? row.sport : '',
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
                              {needsSportAndShift(preference) && (
                                <div className={styles.field}>
                                  <label className={styles.fieldLabel}>Sport</label>
                                  <select
                                    value={row.sport || ''}
                                    onChange={(e) => updateDay(dayIndex, { sport: e.target.value })}
                                    className={styles.select}
                                    aria-label={`${dayLabel} sport`}
                                  >
                                    <option value="">— Sport —</option>
                                    {config.sports.map((s) => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                              <div className={styles.field}>
                                <label className={styles.fieldLabel}>Shift</label>
                                <select
                                  value={row.shiftTiming || 'FULL'}
                                  onChange={(e) => updateDay(dayIndex, { shiftTiming: e.target.value })}
                                  className={styles.select}
                                  aria-label={`${dayLabel} shift`}
                                >
                                  {SHIFT_TIMING_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
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
                    Save preferences
                  </button>
                  <button type="button" onClick={() => setEditMode(false)} className={styles.donePrefBtn}>
                    Done
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
