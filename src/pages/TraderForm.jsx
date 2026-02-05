import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getConfig } from '../config/store'
import {
  getTraderById,
  addTrader,
  updateTrader,
  createBlankTrader,
  isAliasTaken,
  APP_USER_LEVELS,
} from '../data/traders'
import {
  getSkillsByTraderId,
  addSkill,
  updateSkill,
  removeSkill,
  TYPES as SKILL_TYPES,
  LEVELS as SKILL_LEVELS,
} from '../data/traderSkills'
import {
  getPreferencesByTraderId,
  getPreferenceDateRange,
  saveAllPreferences,
  getPreferenceLabel,
  getShiftTimingLabel,
  DAY_LABELS,
  DAY_INDICES,
  PREFERENCE_OPTIONS,
  SHIFT_TIMING_OPTIONS,
} from '../data/traderPreferences'
import {
  getRequestsByTraderId,
  getRequestTypeLabel,
  getRequestStatusLabel,
} from '../data/availabilityRequests'
import styles from './TraderForm.module.css'

const ALIAS_MAX_LENGTH = 20
const SECTIONS = {
  identity: 'identity',
  location: 'location',
  contract: 'contract',
  manager: 'manager',
  skills: 'skills',
  preferences: 'preferences',
  availability: 'availability',
}

function SkillEditRow({ skill, sports, onSave, onCancel, onRemove }) {
  const [sport, setSport] = useState(skill.sport || '')
  const [type, setType] = useState(skill.type || 'primary')
  const [level, setLevel] = useState(skill.level ?? 1)
  return (
    <div className={styles.skillEditRow}>
      <select
        value={sport}
        onChange={(e) => setSport(e.target.value)}
        className={styles.skillSelect}
      >
        <option value="">— Sport —</option>
        {sports.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className={styles.skillSelect}
      >
        <option value="primary">Primary</option>
        <option value="secondary">Secondary</option>
      </select>
      <select
        value={level}
        onChange={(e) => setLevel(Number(e.target.value))}
        className={styles.skillSelect}
      >
        {SKILL_LEVELS.map((l) => (
          <option key={l} value={l}>
            Level {l}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onSave({ sport, type, level })}
        className={styles.skillSaveBtn}
      >
        Save
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className={styles.skillRemoveInEditBtn}
        >
          Remove
        </button>
      )}
      <button type="button" onClick={onCancel} className={styles.skillCancelBtn}>
        Cancel
      </button>
    </div>
  )
}

function formatDateRange(fromDate, toDate) {
  if (!fromDate) return '—'
  if (!toDate || fromDate === toDate) return fromDate
  return `${fromDate} – ${toDate}`
}

function AvailabilityCard({ traderId }) {
  const requests = traderId ? getRequestsByTraderId(traderId) : []
  const statusClass = (status) => {
    if (status === 'CONFIRMED') return styles.avlBadgeConfirmed
    if (status === 'CANCELLED') return styles.avlBadgeCancelled
    return styles.avlBadgePending
  }
  if (requests.length === 0) {
    return <p className={styles.availabilityEmpty}>No availability requests yet.</p>
  }
  return (
    <ul className={styles.availabilityList}>
      {requests.map((r) => (
        <li key={r.id} className={styles.availabilityItem}>
          <span className={styles.availabilityType}>{getRequestTypeLabel(r.type)}</span>
          <span className={styles.availabilityDates}>{formatDateRange(r.fromDate, r.toDate)}</span>
          <span className={`${styles.availabilityBadge} ${statusClass(r.status)}`}>
            {getRequestStatusLabel(r.status)}
          </span>
          {r.note && <span className={styles.availabilityNote}>{r.note}</span>}
        </li>
      ))}
    </ul>
  )
}

function AccordionSection({ id, title, open, onToggle, children }) {
  return (
    <section
      className={styles.accordionItem}
      aria-labelledby={`${id}-heading`}
    >
      <button
        type="button"
        id={`${id}-heading`}
        className={styles.accordionHeader}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
      >
        <span className={styles.accordionTitle}>{title}</span>
        <span className={styles.accordionIcon} aria-hidden data-open={open}>
          ▼
        </span>
      </button>
      <div
        id={`${id}-panel`}
        role="region"
        className={styles.accordionPanel}
        data-open={open}
        aria-hidden={!open}
      >
        <div className={styles.panelContent}>{children}</div>
      </div>
    </section>
  )
}

export default function TraderForm() {
  const { traderId } = useParams()
  const navigate = useNavigate()
  const isNew = !traderId

  const [config, setConfig] = useState(() => getConfig())
  const existing = !isNew && traderId ? getTraderById(traderId) : null
  const [form, setForm] = useState(() =>
    isNew ? createBlankTrader() : existing ? { ...existing } : null
  )
  const [errors, setErrors] = useState({})
  const [openSection, setOpenSection] = useState(null)
  const [skills, setSkills] = useState([])
  const [pendingSkills, setPendingSkills] = useState([])
  const [editingSkillId, setEditingSkillId] = useState(null)
  const [showAddSkillForm, setShowAddSkillForm] = useState(false)
  const [newSkill, setNewSkill] = useState({ sport: '', type: 'primary', level: 1 })
  const [prefs, setPrefs] = useState([])
  const [prefFromDate, setPrefFromDate] = useState('')
  const [prefToDate, setPrefToDate] = useState('')
  const [openPrefDayIndex, setOpenPrefDayIndex] = useState(null)
  const [prefEditMode, setPrefEditMode] = useState(false)

  useEffect(() => {
    if (!isNew && form?.traderId) {
      setSkills(getSkillsByTraderId(form.traderId))
    }
  }, [isNew, form?.traderId])

  useEffect(() => {
    if (!form?.traderId) return
    if (isNew) {
      setPrefs([])
      setPrefFromDate('')
      setPrefToDate('')
      setOpenPrefDayIndex(null)
      return
    }
    setPrefs(getPreferencesByTraderId(form.traderId))
    const range = getPreferenceDateRange(form.traderId)
    setPrefFromDate(range.fromDate || '')
    setPrefToDate(range.toDate || '')
    setOpenPrefDayIndex(null)
    setPrefEditMode(false)
  }, [isNew, form?.traderId])

  const toggleSection = (id) => {
    setOpenSection((current) => (current === id ? null : id))
  }

  useEffect(() => {
    setConfig(getConfig())
  }, [])

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }))
  }

  const validate = () => {
    const next = {}
    if (!(form.firstName || '').trim()) next.firstName = 'Required'
    if (!(form.lastName || '').trim()) next.lastName = 'Required'
    const alias = (form.alias || '').trim()
    if (!alias) next.alias = 'Required'
    else if (alias.length > ALIAS_MAX_LENGTH)
      next.alias = `Max ${ALIAS_MAX_LENGTH} characters`
    else if (isAliasTaken(alias, isNew ? null : form.traderId))
      next.alias = 'Alias already in use'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  if (form === null) {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>Trader not found</h1>
        <p className={styles.notFound}>
          This trader may have been removed. <Link to="/traders/list">Back to list</Link>.
        </p>
      </main>
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    const payload = {
      ...form,
      firstName: (form.firstName || '').trim(),
      lastName: (form.lastName || '').trim(),
      alias: (form.alias || '').trim(),
      location: form.location || '',
      manager: form.manager || '',
      contractHours: form.contractHours === '' ? '' : Number(form.contractHours),
      contractDays: form.contractDays === '' ? '' : Number(form.contractDays),
      weekendPct: form.weekendPct === '' ? '' : Number(form.weekendPct),
      inShiftPct: form.inShiftPct === '' ? '' : Number(form.inShiftPct),
    }
    if (isNew) {
      addTrader(payload)
      const newId = form.traderId
      pendingSkills.forEach(({ sport, type, level }) => {
        addSkill(newId, sport, type, level)
      })
      const prefsToSave = prefs.length ? prefs : DAY_INDICES.map((d) => ({ dayIndex: d, preference: 'NO_PREFERENCE', sport: '', shiftTiming: 'FULL' }))
      saveAllPreferences(newId, prefsToSave, { fromDate: prefFromDate, toDate: prefToDate })
      navigate('/traders/list')
    } else {
      updateTrader(form.traderId, payload)
      const prefsToSave = prefs.length ? prefs : DAY_INDICES.map((d) => ({ dayIndex: d, preference: 'NO_PREFERENCE', sport: '', shiftTiming: 'FULL' }))
      saveAllPreferences(form.traderId, prefsToSave, { fromDate: prefFromDate, toDate: prefToDate })
      navigate('/traders/list')
    }
  }

  const currentTraderId = form?.traderId
  const skillsList = isNew
    ? pendingSkills.map((s, i) => ({ ...s, id: `pending-${i}` }))
    : skills

  const handleAddSkill = (e) => {
    e?.preventDefault?.()
    const sport = (newSkill.sport || '').trim()
    if (!sport) return
    if (isNew) {
      setPendingSkills((prev) => [
        ...prev,
        { sport, type: newSkill.type, level: newSkill.level },
      ])
      setNewSkill({ sport: '', type: 'primary', level: 1 })
    } else {
      addSkill(currentTraderId, sport, newSkill.type, newSkill.level)
      setSkills(getSkillsByTraderId(currentTraderId))
      setNewSkill({ sport: '', type: 'primary', level: 1 })
    }
    setShowAddSkillForm(false)
  }

  const handleRemoveSkill = (id) => {
    if (id.startsWith('pending-')) {
      const i = Number(id.replace('pending-', ''))
      setPendingSkills((prev) => prev.filter((_, idx) => idx !== i))
    } else {
      removeSkill(id)
      setSkills(getSkillsByTraderId(currentTraderId))
    }
    setEditingSkillId(null)
  }

  const handleUpdateSkill = (id, updates) => {
    if (id.startsWith('pending-')) {
      const i = Number(id.replace('pending-', ''))
      setPendingSkills((prev) =>
        prev.map((s, idx) => (idx === i ? { ...s, ...updates } : s))
      )
      setEditingSkillId(null)
    } else {
      updateSkill(id, updates)
      setSkills(getSkillsByTraderId(currentTraderId))
      setEditingSkillId(null)
    }
  }

  const hasPreferenceSet = (preference) => preference && preference !== 'NO_PREFERENCE' && preference !== ''
  const needsSportAndShift = (preference) => preference === 'ON' || preference === 'PREFERRED_ON'

  const updatePrefDay = (dayIndex, updates) => {
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
  }

  const prefRows = prefs.length ? prefs : DAY_INDICES.map((d) => ({ dayIndex: d, preference: 'NO_PREFERENCE', sport: '', shiftTiming: 'FULL' }))
  const togglePrefDay = (dayIndex) => {
    setOpenPrefDayIndex((current) => (current === dayIndex ? null : dayIndex))
  }

  return (
    <main className={styles.page}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <AccordionSection
          id="identity"
          title="Identity"
          open={openSection === SECTIONS.identity}
          onToggle={() => toggleSection(SECTIONS.identity)}
        >
          <label className={styles.label}>
            First Name <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            value={form.firstName}
            onChange={(e) => update('firstName', e.target.value)}
            className={styles.input}
            placeholder="First name"
            aria-invalid={!!errors.firstName}
          />
          {errors.firstName && (
            <span className={styles.error}>{errors.firstName}</span>
          )}

          <label className={styles.label}>
            Last Name <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            value={form.lastName}
            onChange={(e) => update('lastName', e.target.value)}
            className={styles.input}
            placeholder="Last name"
            aria-invalid={!!errors.lastName}
          />
          {errors.lastName && (
            <span className={styles.error}>{errors.lastName}</span>
          )}

          <label className={styles.label}>
            Alias <span className={styles.required}>*</span>{' '}
            <span className={styles.hint}>(max {ALIAS_MAX_LENGTH} chars, unique)</span>
          </label>
          <input
            type="text"
            value={form.alias}
            onChange={(e) => {
              const v = e.target.value.slice(0, ALIAS_MAX_LENGTH)
              update('alias', v)
            }}
            className={styles.input}
            placeholder="Unique alias"
            maxLength={ALIAS_MAX_LENGTH}
            aria-invalid={!!errors.alias}
          />
          <div className={styles.row}>
            {errors.alias && (
              <span className={styles.error}>{errors.alias}</span>
            )}
            <span className={styles.charCount}>
              {form.alias.length}/{ALIAS_MAX_LENGTH}
            </span>
          </div>

          <label className={styles.label}>Trader ID</label>
          <div className={styles.static}>
            {isNew ? 'Assigned when you save' : form.traderId}
          </div>
        </AccordionSection>

        <AccordionSection
          id="location"
          title="Location & Status"
          open={openSection === SECTIONS.location}
          onToggle={() => toggleSection(SECTIONS.location)}
        >
          <label className={styles.label}>Location</label>
          <select
            value={form.location}
            onChange={(e) => update('location', e.target.value)}
            className={styles.select}
          >
            <option value="">— Select —</option>
            {config.locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>

          <label className={styles.label}>Active</label>
          <div className={styles.toggleRow}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="active"
                checked={form.active === true}
                onChange={() => update('active', true)}
                className={styles.radio}
              />
              Yes
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="active"
                checked={form.active === false}
                onChange={() => update('active', false)}
                className={styles.radio}
              />
              No
            </label>
          </div>

          <label className={styles.label}>App User Level</label>
          <select
            value={form.appUserLevel}
            onChange={(e) => update('appUserLevel', e.target.value)}
            className={styles.select}
          >
            {APP_USER_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </AccordionSection>

        <AccordionSection
          id="contract"
          title="Contract"
          open={openSection === SECTIONS.contract}
          onToggle={() => toggleSection(SECTIONS.contract)}
        >
          <label className={styles.label}>Hours per week</label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={form.contractHours}
            onChange={(e) => update('contractHours', e.target.value)}
            className={styles.input}
            placeholder="e.g. 40"
          />

          <label className={styles.label}>Days per week</label>
          <input
            type="number"
            min={0}
            max={7}
            step={0.5}
            value={form.contractDays}
            onChange={(e) => update('contractDays', e.target.value)}
            className={styles.input}
            placeholder="e.g. 5"
          />
        </AccordionSection>

        <AccordionSection
          id="manager"
          title="Manager & Percentages"
          open={openSection === SECTIONS.manager}
          onToggle={() => toggleSection(SECTIONS.manager)}
        >
          <label className={styles.label}>Manager</label>
          <select
            value={form.manager}
            onChange={(e) => update('manager', e.target.value)}
            className={styles.select}
          >
            <option value="">— Select —</option>
            {config.managers.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <label className={styles.label}>Weekend % (entered by manager)</label>
          <input
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={form.weekendPct}
            onChange={(e) => update('weekendPct', e.target.value)}
            className={styles.input}
            placeholder="e.g. 25"
          />

          <label className={styles.label}>IN Shift % (entered by manager)</label>
          <input
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={form.inShiftPct}
            onChange={(e) => update('inShiftPct', e.target.value)}
            className={styles.input}
            placeholder="e.g. 50"
          />
        </AccordionSection>

        <AccordionSection
          id="skills"
          title="Trader Skill Level"
          open={openSection === SECTIONS.skills}
          onToggle={() => toggleSection(SECTIONS.skills)}
        >
          <div className={styles.skillAddRow}>
            {!showAddSkillForm ? (
              <button
                type="button"
                onClick={() => setShowAddSkillForm(true)}
                className={styles.skillAddBtn}
              >
                Add
              </button>
            ) : (
              <>
                <select
                  value={newSkill.sport}
                  onChange={(e) => setNewSkill((s) => ({ ...s, sport: e.target.value }))}
                  className={styles.skillSelect}
                  aria-label="Sport"
                >
                  <option value="">— Sport —</option>
                  {config.sports.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  value={newSkill.type}
                  onChange={(e) =>
                    setNewSkill((s) => ({ ...s, type: e.target.value }))
                  }
                  className={styles.skillSelect}
                  aria-label="Primary or Secondary"
                >
                  <option value="primary">Primary</option>
                  <option value="secondary">Secondary</option>
                </select>
                <select
                  value={newSkill.level}
                  onChange={(e) =>
                    setNewSkill((s) => ({ ...s, level: Number(e.target.value) }))
                  }
                  className={styles.skillSelect}
                  aria-label="Level"
                >
                  {SKILL_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      Level {l}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className={styles.skillAddBtn}
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSkillForm(false)
                    setNewSkill({ sport: '', type: 'primary', level: 1 })
                  }}
                  className={styles.skillCancelBtn}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
          {skillsList.length === 0 ? (
            <p className={styles.skillEmpty}>No sports assigned yet.</p>
          ) : (
            <div className={styles.skillListScroll}>
              <ul className={styles.skillList}>
                {skillsList.map((skill) => (
                  <li key={skill.id} className={styles.skillItem}>
                    {editingSkillId === skill.id ? (
                      <SkillEditRow
                        skill={skill}
                        sports={config.sports}
                        onSave={(updates) => handleUpdateSkill(skill.id, updates)}
                        onCancel={() => setEditingSkillId(null)}
                        onRemove={() => handleRemoveSkill(skill.id)}
                      />
                    ) : (
                      <>
                        <span className={styles.skillDisplay}>
                          <strong>{skill.sport}</strong>{' '}
                          <span
                            className={
                              skill.type === 'primary'
                                ? styles.skillBadgePrimary
                                : styles.skillBadgeSecondary
                            }
                          >
                            {skill.type === 'primary' ? 'Primary' : 'Secondary'}
                          </span>{' '}
                          Level {skill.level}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingSkillId(skill.id)}
                          className={styles.skillEditBtn}
                        >
                          Edit
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </AccordionSection>

        <AccordionSection
          id="preferences"
          title="Preferences"
          open={openSection === SECTIONS.preferences}
          onToggle={() => toggleSection(SECTIONS.preferences)}
        >
          {!prefEditMode ? (
            <>
              <div className={styles.prefViewSummary}>
                <div className={styles.prefViewDateRangeField}>
                  <span className={styles.prefViewDateRangeLabel}>Date range</span>
                  <span className={styles.prefViewDateRangeValue}>
                    {(prefFromDate || prefToDate)
                      ? `From ${prefFromDate || '—'} to ${prefToDate || '—'}`
                      : 'No date range set'}
                  </span>
                </div>
                <ul className={styles.prefViewDayList}>
                  {prefRows.map((row, i) => {
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
                      <li key={dayIndex} className={styles.prefViewDayRow}>
                        <span className={styles.prefViewDayName}>{DAY_LABELS[dayIndex]}</span>
                        <span className={styles.prefViewDayDetail}>
                          {isNoPref ? label : `${label} – ${detail}`}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => setPrefEditMode(true)}
                className={styles.prefEditBtn}
              >
                Edit preferences
              </button>
            </>
          ) : (
            <>
          <div className={styles.prefDateRow}>
            <div className={styles.prefField}>
              <label className={styles.prefFieldLabel} htmlFor="trader-pref-from">From</label>
              <input
                id="trader-pref-from"
                type="date"
                value={prefFromDate}
                onChange={(e) => setPrefFromDate(e.target.value)}
                className={styles.prefDateInput}
                aria-label="Valid from date"
              />
            </div>
            <div className={styles.prefField}>
              <label className={styles.prefFieldLabel} htmlFor="trader-pref-to">To</label>
              <input
                id="trader-pref-to"
                type="date"
                value={prefToDate}
                onChange={(e) => setPrefToDate(e.target.value)}
                className={styles.prefDateInput}
                aria-label="Valid to date"
              />
            </div>
          </div>
          <ul className={styles.prefCardList} aria-label="Daily preferences">
            {prefRows.map((row, i) => {
              const dayIndex = row.dayIndex ?? i
              const dayLabel = DAY_LABELS[dayIndex]
              const preference = row.preference || 'NO_PREFERENCE'
              const hasPreference = hasPreferenceSet(preference)
              const isOpen = openPrefDayIndex === dayIndex
              return (
                <li key={dayIndex} className={styles.prefCardItem}>
                  <div className={styles.prefCard}>
                    <button
                      type="button"
                      className={styles.prefCardHeader}
                      onClick={() => togglePrefDay(dayIndex)}
                      aria-expanded={isOpen}
                      aria-controls={`trader-pref-panel-${dayIndex}`}
                      id={`trader-pref-heading-${dayIndex}`}
                    >
                      <span className={styles.prefCardDay}>{dayLabel}</span>
                      <span className={hasPreference ? styles.prefBadgePreference : styles.prefBadgeNoPreference}>
                        {hasPreference ? 'Preference' : 'No Preference'}
                      </span>
                      <span className={styles.prefCardChevron} aria-hidden data-open={isOpen}>▼</span>
                    </button>
                    <div
                      id={`trader-pref-panel-${dayIndex}`}
                      role="region"
                      className={styles.prefCardPanel}
                      data-open={isOpen}
                      aria-hidden={!isOpen}
                      aria-labelledby={`trader-pref-heading-${dayIndex}`}
                    >
                      <div className={styles.prefCardBody}>
                        <div className={styles.prefField}>
                          <label className={styles.prefFieldLabel}>Preference</label>
                          <select
                            value={preference}
                            onChange={(e) =>
                              updatePrefDay(dayIndex, {
                                preference: e.target.value,
                                sport: needsSportAndShift(e.target.value) ? row.sport : '',
                              })
                            }
                            className={styles.prefSelect}
                            aria-label={`${dayLabel} preference`}
                          >
                            {PREFERENCE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        {needsSportAndShift(preference) && (
                            <div className={styles.prefField}>
                              <label className={styles.prefFieldLabel}>Sport</label>
                              <select
                                value={row.sport || ''}
                                onChange={(e) => updatePrefDay(dayIndex, { sport: e.target.value })}
                                className={styles.prefSelect}
                                aria-label={`${dayLabel} sport`}
                              >
                                <option value="">— Sport —</option>
                                {config.sports.map((s) => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          <div className={styles.prefField}>
                            <label className={styles.prefFieldLabel}>Shift</label>
                            <select
                              value={row.shiftTiming || 'FULL'}
                              onChange={(e) => updatePrefDay(dayIndex, { shiftTiming: e.target.value })}
                              className={styles.prefSelect}
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
              <button
                type="button"
                onClick={() => setPrefEditMode(false)}
                className={styles.prefDoneBtn}
              >
                Done
              </button>
            </>
          )}
        </AccordionSection>

        <AccordionSection
          id="availability"
          title="Availability"
          open={openSection === SECTIONS.availability}
          onToggle={() => toggleSection(SECTIONS.availability)}
        >
          {isNew ? (
            <p className={styles.availabilityEmpty}>Save the trader first to view and add availability requests.</p>
          ) : (
            <>
              <AvailabilityCard traderId={currentTraderId} />
              <Link to="/traders/availability" state={{ traderId: currentTraderId }} className={styles.availabilityLink}>
                Manage availability requests →
              </Link>
            </>
          )}
        </AccordionSection>

        <div className={styles.actions}>
          <button type="submit" className={styles.submitBtn}>
            {isNew ? 'Create Trader' : 'Save Changes'}
          </button>
          <Link to="/traders/list" className={styles.cancelBtn}>
            Cancel
          </Link>
        </div>
      </form>
    </main>
  )
}
