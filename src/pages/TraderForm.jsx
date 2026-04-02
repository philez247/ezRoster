import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getConfig } from '../config/store'
import {
  APP_USER_LEVELS,
  addTrader,
  createBlankTrader,
  getTraderById,
  isAliasTaken,
  updateTrader,
} from '../data/traders'
import { getSkillsByTraderId } from '../data/traderSkills'
import {
  DAY_LABELS,
  getPreferenceDateRange,
  getPreferenceSummary,
  getPreferencesByTraderId,
} from '../data/traderPreferences'
import styles from './TraderForm.module.css'

const ALIAS_MAX_LENGTH = 20
const SECTIONS = {
  identity: 'identity',
  location: 'location',
  contract: 'contract',
  manager: 'manager',
  skills: 'skills',
  preferences: 'preferences',
}

function AccordionSection({ id, title, open, onToggle, children }) {
  return (
    <section className={styles.accordionItem} aria-labelledby={`${id}-heading`}>
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
          v
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

function formatPreferenceRange(fromDate, toDate) {
  if (!fromDate && !toDate) return 'No date range set'
  return `From ${fromDate || '-'} to ${toDate || '-'}`
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
  const [prefs, setPrefs] = useState([])
  const [prefFromDate, setPrefFromDate] = useState('')
  const [prefToDate, setPrefToDate] = useState('')

  useEffect(() => {
    setConfig(getConfig())
  }, [])

  useEffect(() => {
    if (isNew || !form?.traderId) {
      setSkills([])
      return
    }
    setSkills(getSkillsByTraderId(form.traderId))
  }, [isNew, form?.traderId])

  useEffect(() => {
    if (isNew || !form?.traderId) {
      setPrefs([])
      setPrefFromDate('')
      setPrefToDate('')
      return
    }
    setPrefs(getPreferencesByTraderId(form.traderId))
    const range = getPreferenceDateRange(form.traderId)
    setPrefFromDate(range.fromDate || '')
    setPrefToDate(range.toDate || '')
  }, [isNew, form?.traderId])

  const toggleSection = (id) => {
    setOpenSection((current) => (current === id ? null : id))
  }

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }))
  }

  const validate = () => {
    const next = {}
    if (!(form.firstName || '').trim()) next.firstName = 'Required'
    if (!(form.lastName || '').trim()) next.lastName = 'Required'
    const alias = (form.alias || '').trim()
    if (!alias) next.alias = 'Required'
    else if (alias.length > ALIAS_MAX_LENGTH) next.alias = `Max ${ALIAS_MAX_LENGTH} characters`
    else if (isAliasTaken(alias, isNew ? null : form.traderId)) next.alias = 'Alias already in use'
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

    if (isNew) addTrader(payload)
    else updateTrader(form.traderId, payload)

    navigate('/traders/list')
  }

  const prefRows = prefs.length
    ? prefs
    : DAY_LABELS.map((_, dayIndex) => ({ dayIndex, preference: 'NO_PREFERENCE' }))

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
          {errors.firstName && <span className={styles.error}>{errors.firstName}</span>}

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
          {errors.lastName && <span className={styles.error}>{errors.lastName}</span>}

          <label className={styles.label}>
            Alias <span className={styles.required}>*</span>{' '}
            <span className={styles.hint}>(max {ALIAS_MAX_LENGTH} chars, unique)</span>
          </label>
          <input
            type="text"
            value={form.alias}
            onChange={(e) => update('alias', e.target.value.slice(0, ALIAS_MAX_LENGTH))}
            className={styles.input}
            placeholder="Unique alias"
            maxLength={ALIAS_MAX_LENGTH}
            aria-invalid={!!errors.alias}
          />
          <div className={styles.row}>
            {errors.alias && <span className={styles.error}>{errors.alias}</span>}
            <span className={styles.charCount}>
              {form.alias.length}/{ALIAS_MAX_LENGTH}
            </span>
          </div>

          <label className={styles.label}>Trader ID</label>
          <div className={styles.static}>{isNew ? 'Assigned when you save' : form.traderId}</div>
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
            <option value="">- Select -</option>
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
            <option value="">- Select -</option>
            {config.managers.map((manager) => (
              <option key={manager} value={manager}>
                {manager}
              </option>
            ))}
          </select>

          <label className={styles.label}>Weekend %</label>
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

          <label className={styles.label}>IN Shift %</label>
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
          {skills.length === 0 ? (
            <p className={styles.skillEmpty}>No sports assigned yet.</p>
          ) : (
            <div className={styles.skillListScroll}>
              <ul className={styles.skillList}>
                {skills.map((skill) => (
                  <li key={skill.id} className={styles.skillItem}>
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
          <div className={styles.prefViewSummary}>
            <div className={styles.prefViewDateRangeField}>
              <span className={styles.prefViewDateRangeLabel}>Date range</span>
              <span className={styles.prefViewDateRangeValue}>
                {formatPreferenceRange(prefFromDate, prefToDate)}
              </span>
            </div>
            <ul className={styles.prefViewDayList}>
              {prefRows.map((row, index) => {
                const dayIndex = row.dayIndex ?? index
                return (
                  <li key={dayIndex} className={styles.prefViewDayRow}>
                    <span className={styles.prefViewDayName}>{DAY_LABELS[dayIndex]}</span>
                    <span className={styles.prefViewDayDetail}>{getPreferenceSummary(row)}</span>
                  </li>
                )
              })}
            </ul>
          </div>
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
